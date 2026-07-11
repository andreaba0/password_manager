package backend_integration

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"
	"time"

	"andreabarchietto.it/password_manager/test_suite/env"
	"andreabarchietto.it/password_manager/test_suite/utils"
	"github.com/go-faker/faker/v4"
)

type SignInFlowBeginRequest struct {
	Email string `json:"email"`
}

func TestSignInFlowBegin(t *testing.T) {
	ctx := context.Background()

	valkeyClient := ValkeyService.GetClientPublic(ctx)
	postgresClient := PostgresService.GetClientPublic(ctx)

	utils.TestingCallbackClearEnvironment(t, ctx, PostgresService, ValkeyService, func() {
		url := BackendService.GetClientPublic(ctx)

		// --- Tier Up: Flush Valkey ---
		err := valkeyClient.Do(ctx, valkeyClient.B().Flushall().Build()).Error()
		if err != nil {
			t.Fatalf("Failed to flush Valkey: %v", err)
		}

		// --- Tier Up: Generate Ed25519 Key Pair ---
		pubKey, _, err := ed25519.GenerateKey(rand.Reader)
		if err != nil {
			t.Fatalf("Failed to generate ed25519 keys: %v", err)
		}

		// --- Tier Up: Encrypt Public Key with AES-GCM ---
		encryptedPubKey, err := encryptAESGCM(pubKey, envManager.Get(env.PostgresEncryptionSecret))
		if err != nil {
			t.Fatalf("Failed to encrypt public key: %v", err)
		}

		// --- Tier Up: Mock Fake User ---
		email := faker.Email()
		username := faker.Username()
		salt := make([]byte, 16)
		if _, err := rand.Read(salt); err != nil {
			t.Fatalf("Failed to generate salt: %v", err)
		}

		// --- Tier Up: Insert into Database ---
		query := `
			INSERT INTO users (email, username, salt, public_key, created_at)
			VALUES ($1, $2, $3, $4, $5) RETURNING id`

		var userID int64
		err = postgresClient.QueryRow(ctx, query, email, username, salt, encryptedPubKey, time.Now()).Scan(&userID)
		if err != nil {
			t.Fatalf("Failed to insert mock user into database: %v", err)
		}

		// --- Execute Request to Backend ---
		reqBody := SignInFlowBeginRequest{
			Email: email,
		}
		jsonBody, err := json.Marshal(reqBody)
		if err != nil {
			t.Fatalf("Failed to marshal request json: %v", err)
		}

		endpoint := fmt.Sprintf("%s/api/signin-flow/begin", url)
		resp, err := http.Post(endpoint, "application/json", bytes.NewBuffer(jsonBody))
		if err != nil {
			t.Fatalf("Failed to send POST request to backend: %v", err)
		}
		defer resp.Body.Close()

		// --- Assertions ---
		if resp.StatusCode != http.StatusOK {
			bodyBytes, _ := io.ReadAll(resp.Body)
			t.Errorf("Expected status code 200, got %d. Response: %s", resp.StatusCode, string(bodyBytes))
		}
	})

}

// Helper to encrypt data using AES-GCM
func encryptAESGCM(plaintext []byte, hexKey string) ([]byte, error) {
	key, err := hex.DecodeString(hexKey)
	if err != nil {
		return nil, fmt.Errorf("failed to decode hex key: %w", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, aesgcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}

	// Seal appends the ciphertext to the nonce, keeping them together
	ciphertext := aesgcm.Seal(nonce, nonce, plaintext, nil)
	return ciphertext, nil
}
