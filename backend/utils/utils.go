package utils

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func DecodeRequest(r *http.Request, v interface{}) error {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return err
	}
	return json.Unmarshal(body, v)
}

func GenerateSaltFromEmail(email string) []byte {
	// generate salt from hmac-sha256(email, secret from env)
	secret := os.Getenv("SALT_SECRET")
	if secret == "" {
		panic("SALT_SECRET environment variable is not set")
	}
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(email))
	return h.Sum(nil)
}

func GenerateNonce() ([]byte, error) {
	// generate random 128 bit
	nonce := make([]byte, 16)
	_, err := rand.Read(nonce)
	if err != nil {
		return nil, fmt.Errorf("failed to generate secure nonce: %w", err)
	}

	return nonce, nil
}
