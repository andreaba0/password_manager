package keymanager

import (
	"context"
	"errors"
	"log"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/oklog/ulid/v2"
)

type KeyManager struct {
	keys [3]struct {
		id         ulid.ULID
		privateKey []byte
		publicKey  []byte
	}
	expireAt int64
	lock     sync.RWMutex // Upgraded to RWMutex to allow concurrent non-blocking reads
	DB       *pgxpool.Pool
}

// GetEncryption returns the private key used for signing JWTs (keys[1]).
func (km *KeyManager) GetEncryption() ([]byte, string, error) {
	now := time.Now().Unix()

	// 1. Fast path: If keys are valid, use a Read-Lock (highly concurrent)
	km.lock.RLock()
	if now <= km.expireAt {
		privKey := km.keys[1].privateKey
		keyName := km.keys[1].id.String()
		km.lock.RUnlock()
		return privKey, keyName, nil
	}
	km.lock.RUnlock()

	// 2. Slow path: Keys are expired, acquire an exclusive Write-Lock
	km.lock.Lock()
	defer km.lock.Unlock()

	// Double-checked locking pattern: Check if a concurrent routine updated it while we waited
	if time.Now().Unix() > km.expireAt {
		if err := km.refreshKeysFromDB(); err != nil {
			// Rule: Log failure, skip updating, and extend the expired timestamp
			// slightly (5 seconds) to prevent hammering the DB on subsequent requests.
			log.Printf("Warning: Key rotation query failed. Falling back to cached memory: %v", err)
			km.expireAt = time.Now().Add(5 * time.Second).Unix()
		}
	}

	return km.keys[1].privateKey, km.keys[1].id.String(), nil
}

// GetKey searches for a public key matching the given name across the 3 loaded keys.
func (km *KeyManager) GetKey(name string) ([]byte, bool) {
	km.lock.RLock()
	defer km.lock.RUnlock()

	for _, k := range km.keys {
		if k.id.String() == name {
			return k.publicKey, true
		}
	}
	return nil, false
}

// refreshKeysFromDB executes the SQL query to populate the 3 slots.
func (km *KeyManager) refreshKeysFromDB() error {
	// Create a short timeout context so the database call can't hang infinitely
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if km.DB == nil {
		return errors.New("database connection pool is nil")
	}

	// Adjust the query below to match your exact database layout.
	// We expect a query that returns exactly 3 rows sorted from oldest to newest.
	query := `
		SELECT name, private_key, public_key
		FROM jwt_keys
		ORDER BY created_at DESC
		LIMIT 3
	`

	rows, err := km.DB.Query(ctx, query)
	if err != nil {
		return err
	}
	defer rows.Close()

	var newKeys [3]struct {
		id         ulid.ULID
		privateKey []byte
		publicKey  []byte
	}

	idx := 0
	for rows.Next() {
		if idx >= 3 {
			break
		}
		err := rows.Scan(&newKeys[idx].id, &newKeys[idx].privateKey, &newKeys[idx].publicKey)
		if err != nil {
			return err
		}
		idx++
	}

	if err = rows.Err(); err != nil {
		return err
	}

	// If the database has fewer than 3 keys available, abort the rotation
	if idx < 3 {
		return errors.New("database did not return enough keys (minimum 3 required)")
	}

	// Because of DESC sorting:
	// newKeys[0] = newest key (next candidate)
	// newKeys[1] = active signing key
	// newKeys[2] = oldest key (grace period validation)
	km.keys = newKeys

	// Extend the true expiration window (e.g., 24 hours)
	km.expireAt = time.Now().Add(24 * time.Hour).Unix()
	log.Println("🔄 JWT key rotation successfully completed from database.")
	return nil
}
