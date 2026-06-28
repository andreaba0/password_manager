package keymanager

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"sync"
	"time"

	"andreabarchietto.it/password_manager/backend/kms"
	"andreabarchietto.it/password_manager/backend/utils"
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
	sf            singleflight.Group
	valkeyCacheId []byte
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
	backendId, err := utils.GenerateBackendId()
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

func (km *KeyManager) getKmsCacheId() string {
	base64encodedId := base64.RawURLEncoding.EncodeToString(km.valkeyCacheId)
	return fmt.Sprintf("kms:%s", base64encodedId)
}

// GetSigningKey fetches the current active signing private key
func (km *KeyManager) GetSigningKey(ctx context.Context) (ulid.ULID, []byte, error) {
	// 1. Try querying Valkey
	res, err, _ := km.sf.Do("pull_signing_key", func() (any, error) {
		val, err := km.vk.Do(ctx, km.vk.B().Hget().Key(km.getKmsCacheId()).Field("signing_key").Build()).ToString()
		return val, err
	})
	if err == nil {
		val := res.([]byte)
		decrypted, err := km.localKms.DecryptCacheData(val)
		if err == nil {
			return ulid.ULID(decrypted[:16]), decrypted[16:], nil
		}
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
	res, err, _ := km.sf.Do("pull_verifying_key", func() (any, error) {
		values, err := km.vk.Do(ctx, km.vk.B().Hgetall().Key(km.getKmsCacheId()).Build()).AsMap()
		if err != nil {
			return nil, err
		}
		return values, nil
	})
	if err == nil {
		data := res.(map[string]valkey.ValkeyMessage)
		if len(data) > 0 {
			if value, exists := data[kid]; exists {
				data, err := value.AsBytes()
				if err == nil {
					return km.localKms.DecryptCacheData(data)
				}
			} else {
				return nil, KeyNotFound
			}
		}
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

	if len(rows) < 3 {
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
	hsetCmd := km.vk.B().Hset().Key(km.getKmsCacheId()).FieldValue().
		FieldValue(fieldsAndValues[0], fieldsAndValues[1]).
		FieldValue(fieldsAndValues[2], fieldsAndValues[3]).
		FieldValue(fieldsAndValues[4], fieldsAndValues[5]).
		FieldValue(fieldsAndValues[6], fieldsAndValues[7]).Build()
	if err := km.vk.Do(ctx, hsetCmd).Error(); err != nil {
		return nil, fmt.Errorf("failed to HSET data into valkey: %w", err)
	}

	// Set expiration to 10 minutes
	expireCmd := km.vk.B().Expire().Key(km.getKmsCacheId()).Seconds(600).Build()
	if err := km.vk.Do(ctx, expireCmd).Error(); err != nil {
		return nil, fmt.Errorf("failed to set valkey expiration: %w", err)
	}

	return rows, nil
}
