package signinflow

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ed25519"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"testing"
	"time"

	"andreabarchietto.it/password_manager/test_suite/env"
	"andreabarchietto.it/password_manager/test_suite/services"
	"github.com/go-faker/faker/v4"
	_ "github.com/lib/pq"
	"github.com/valkey-io/valkey-go"
)

var (
	db           *sql.DB
	valkeyClient valkey.Client
	backendURL   = "http://localhost:8080" // Matches backend mapped port
)

const (
	// Encryption secret from docker-compose
	postgresEncryptionSecret = "e514469ff002dfaa472fce6da2d89fa7"
)

func TestMain(m *testing.M) {

	// Preload environment variables and throw an error if any are missing
	var currentEnvironmentVariables []env.VariableName
	currentEnvironmentVariables = append(currentEnvironmentVariables, env.RequiredPostgresVariables...)
	currentEnvironmentVariables = append(currentEnvironmentVariables, env.RequiredServiceVariables...)
	currentEnvironmentVariables = append(currentEnvironmentVariables, env.RequiredValkeyVariables...)
	currentEnvironmentVariables = append(currentEnvironmentVariables, env.RequiredBackendVariables...)
	envManager := env.NewEnvManager()
	envManager.LoadEnv(currentEnvironmentVariables)

	var err error
	var postgresService services.Service

	// 1. Initialize Postgres Connection
	connStr := "host=localhost port=5432 user=test_user password=test_password dbname=test_db sslmode=disable"
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		fmt.Printf("Failed to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	// 2. Initialize Valkey Connection
	valkeyClient, err = valkey.NewClient(valkey.ClientOption{
		InitAddress: []string{"127.0.0.1:6379"},
	})
	if err != nil {
		fmt.Printf("Failed to connect to Valkey: %v\n", err)
		os.Exit(1)
	}
	defer valkeyClient.Close()

	tierup(postgresService)
	m.Run()
	tierdown()

	os.Exit(0)
}

func tierup(services ...services.Service) {
	for _, service := range services {
		_ = service.Run()
	}
}

func tierdown(services ...services.Service) {
	for _, service := range services {
		_ = service.Destroy()
	}
}

// SignInFlowBeginRequest matches your specified structure
type SignInFlowBeginRequest struct {
	Email string `json:"email"`
}

func TestSignInFlowBegin(t *testing.T) {
	ctx := context.Background()

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
	encryptedPubKey, err := encryptAESGCM(pubKey, postgresEncryptionSecret)
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
	err = db.QueryRowContext(ctx, query, email, username, salt, encryptedPubKey, time.Now()).Scan(&userID)
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

	endpoint := fmt.Sprintf("%s/api/signin-flow/begin", backendURL)
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
