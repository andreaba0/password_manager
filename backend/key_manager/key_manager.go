package keymanager

import (
	"context"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"fmt"
	"sync"
	"time"

	"andreabarchietto.it/password_manager/backend/kms"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/oklog/ulid/v2"
	"github.com/valkey-io/valkey-go"
	"golang.org/x/sync/singleflight"
)

// KeyRow maps exactly to the database schema
type KeyRow struct {
	ID         string
	PrivateKey []byte
	PublicKey  []byte
	CreatedAt  time.Time
}

// KeyManager singleton struct
type KeyManager struct {
	localKms      *kms.LocalKMS
	db            *pgxpool.Pool
	vk            valkey.Client
	prefix        string
	sf            singleflight.Group
	valkeyCacheId int64
}

var (
	instance *KeyManager
	once     sync.Once
)

var (
	KeyNotFound        = errors.New("Not found")
	BrokenCacheData    = errors.New("Broken cache data")
	BrokenDatabaseData = errors.New("Broken database data")
)

// InitKeyManager initializes the singleton instance
func InitKeyManager(localKms *kms.LocalKMS, db *pgxpool.Pool, vk valkey.Client) (*KeyManager, error) {
	ctx := context.Background()
	backendId, err := vk.Do(ctx, vk.B().Incr().Key("kms_backend_id").Build()).AsInt64()
	if err != nil {
		return nil, err
	}
	once.Do(func() {
		instance = &KeyManager{
			localKms:      localKms,
			db:            db,
			vk:            vk,
			valkeyCacheId: backendId,
		}
	})
	return instance, nil
}

func (km *KeyManager) getValkeyCacheId() string {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, uint64(km.valkeyCacheId))
	return base64.RawURLEncoding.EncodeToString(buf)
}

// GetSigningKey fetches the current active signing private key
func (km *KeyManager) GetSigningKey(ctx context.Context) (ulid.ULID, []byte, error) {
	// 1. Try querying Valkey
	res, err, _ := km.sf.Do("pull_signing_key", func() (any, error) {
		val, err := km.vk.Do(ctx, km.vk.B().Hget().Key(km.prefix).Field("signing_key").Build()).ToString()
		if err != nil {
			return nil, err
		}
		// Found in Valkey, decrypt and return private key (skip first 16 bytes uuid)
		decrypted, err := km.localKms.DecryptCacheData([]byte(val))
		if err != nil {
			return nil, BrokenCacheData
		}
		if len(decrypted) < 16+32 {
			return nil, BrokenCacheData
		}
		return decrypted, nil
	})
	if err == nil {
		decrypted := res.([]byte)
		return ulid.ULID(decrypted[:16]), decrypted[16:], nil
	}
	if valkey.IsValkeyNil(err) {
		return ulid.Zero, nil, KeyNotFound
	}
	if !errors.Is(err, BrokenCacheData) {
		return ulid.Zero, nil, err
	}

	// 2. Cache miss: Fetch from Postgres, refresh Valkey, and return row[1]
	res, err, _ = km.sf.Do("refresh", func() (any, error) {
		// This inner block will only execute ONCE for all concurrent requests hitting it at this moment
		rows, err := km.refreshCache(ctx)
		if err != nil {
			return nil, err
		}
		return rows, nil
	})
	if err != nil {
		return ulid.Zero, nil, err
	}
	rows := res.([]KeyRow)
	id, err := ulid.Parse(rows[1].ID)
	if err != nil {
		return ulid.Zero, nil, err
	}
	return id, rows[1].PrivateKey, nil
}

// GetVerifyingKey fetches the verification public key matching the given kid
func (km *KeyManager) GetVerifyingKey(ctx context.Context, kid string) ([]byte, error) {
	// 1. Try querying Valkey
	sfKey := fmt.Sprintf("pull_verifying_key:%s", kid)
	res, err, _ := km.sf.Do(sfKey, func() (any, error) {
		val, err := km.vk.Do(ctx, km.vk.B().Hget().Key(km.prefix).Field(kid).Build()).ToString()
		if err != nil {
			return nil, err
		}
		decrypted, err := km.localKms.DecryptCacheData([]byte(val))
		if err != nil {
			return nil, BrokenCacheData
		}
		return decrypted, nil
	})
	if err == nil {
		return res.([]byte), nil
	}
	if valkey.IsValkeyNil(err) {
		return nil, KeyNotFound
	}
	if !errors.Is(err, BrokenCacheData) {
		return nil, err
	}

	// 2. Cache miss: Fetch from Postgres, refresh Valkey
	res, err, _ = km.sf.Do("refresh", func() (any, error) {
		// This inner block will only execute ONCE for all concurrent requests hitting it at this moment
		rows, err := km.refreshCache(ctx)
		if err != nil {
			return nil, err
		}
		return rows, nil
	})
	if err != nil {
		return nil, err
	}
	rows := res.([]KeyRow)

	// Search for the matching kid in the freshly fetched database rows
	for _, row := range rows {
		if row.ID == kid {
			return row.PublicKey, nil
		}
	}

	return nil, fmt.Errorf("key with kid %s not found", kid)
}

func (km *KeyManager) refreshCache(ctx context.Context) ([]KeyRow, error) {
	// Query the last 3 rows ordered by created_at desc
	query := `
			SELECT id, private_key, public_key, created_at
			FROM session_keys
			ORDER BY created_at DESC
			LIMIT 3`

	dbRows, err := km.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query postgres: %w", err)
	}
	defer dbRows.Close()

	var rows []KeyRow
	for dbRows.Next() {
		var r KeyRow
		if err := dbRows.Scan(&r.ID, &r.PrivateKey, &r.PublicKey, &r.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan postgres row: %w", err)
		}
		rows = append(rows, r)
	}

	if len(rows) < 2 {
		return nil, fmt.Errorf("insufficient keys in database: expected at least 2, got %d", len(rows))
	}

	// Format and encrypt row[1]'s private key for "signing_key"
	ulidBytes, err := ulid.Parse(rows[1].ID)
	if err != nil {
		return nil, fmt.Errorf("invalid ulid: %s: %w", rows[1].ID, BrokenDatabaseData)
	}
	signingPlaintext := append(ulidBytes[:], rows[1].PrivateKey...)

	encSigning, err := km.localKms.EncryptCacheData(signingPlaintext)
	if err != nil {
		return nil, err
	}

	// We'll build a slice of alternating field-value pairs for the HSET command
	// valkey-go allows passing a slice of strings directly using the variadic builder variants
	fieldsAndValues := make([]string, 0, 2+(len(rows)*2))
	fieldsAndValues = append(fieldsAndValues, "signing_key", string(encSigning))

	// Add all 3 public keys mapped by their respective kid UUIDs
	for _, r := range rows {
		encPub, err := km.localKms.EncryptCacheData([]byte(r.PublicKey))
		if err != nil {
			return nil, err
		}
		fieldsAndValues = append(fieldsAndValues, r.ID, string(encPub))
	}

	// Use valkey-go's multi-argument Hset variant via slice expansion
	hsetCmd := km.vk.B().Hset().Key(km.prefix).FieldValue().
		FieldValue(fieldsAndValues[0], fieldsAndValues[1]).
		FieldValue(fieldsAndValues[2], fieldsAndValues[3]).
		FieldValue(fieldsAndValues[4], fieldsAndValues[5]).
		FieldValue(fieldsAndValues[6], fieldsAndValues[7]).Build()
	if err := km.vk.Do(ctx, hsetCmd).Error(); err != nil {
		return nil, fmt.Errorf("failed to HSET data into valkey: %w", err)
	}

	// Set expiration to 10 minutes
	expireCmd := km.vk.B().Expire().Key(km.prefix).Seconds(600).Build()
	if err := km.vk.Do(ctx, expireCmd).Error(); err != nil {
		return nil, fmt.Errorf("failed to set valkey expiration: %w", err)
	}

	return rows, nil
}
