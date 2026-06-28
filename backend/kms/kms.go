package kms

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"fmt"
)

type LocalKMS struct {
	kmsStorageSecret []byte
	sessionSecret    []byte
	postgresSecret   []byte
	saltSecret       []byte
}

func NewLocalKMS(kmsStorageSecret, sessionSecret, postgresSecret, saltSecret []byte) *LocalKMS {
	return &LocalKMS{
		kmsStorageSecret: kmsStorageSecret,
		sessionSecret:    sessionSecret,
		postgresSecret:   postgresSecret,
		saltSecret:       saltSecret,
	}
}

func (c *LocalKMS) SignSession(session []byte) []byte {
	mac := hmac.New(sha256.New, c.sessionSecret)
	mac.Write(session)
	return mac.Sum(nil)
}

func (c *LocalKMS) SignSalt(salt []byte) []byte {
	mac := hmac.New(sha256.New, c.saltSecret)
	mac.Write(salt)
	return mac.Sum(nil)
}

func (c *LocalKMS) VerifySession(session, signature []byte) bool {
	mac := hmac.New(sha256.New, c.sessionSecret)
	mac.Write(session)
	return hmac.Equal(mac.Sum(nil), signature)
}

func (c *LocalKMS) EncryptCacheData(data []byte) ([]byte, error) {
	return c.aesGcmEncryption(data, c.kmsStorageSecret)
}

func (c *LocalKMS) EncryptPostgresData(data []byte) ([]byte, error) {
	return c.aesGcmEncryption(data, c.postgresSecret)
}

func (c *LocalKMS) aesGcmEncryption(data, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	aesNonce := make([]byte, aesGCM.NonceSize())
	if _, err := rand.Read(aesNonce); err != nil {
		return nil, err
	}

	ciphertext := aesGCM.Seal(aesNonce, aesNonce, data, nil)
	return ciphertext, nil
}

func (c *LocalKMS) DecryptCacheData(ciphertext []byte) ([]byte, error) {
	return c.aesGcmDecryption(ciphertext, c.kmsStorageSecret)
}

func (c *LocalKMS) DecryptPostgresData(ciphertext []byte) ([]byte, error) {
	return c.aesGcmDecryption(ciphertext, c.postgresSecret)
}

func (c *LocalKMS) aesGcmDecryption(ciphertext, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := aesGCM.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, fmt.Errorf("ciphertext too short")
	}
	aesNonce := ciphertext[:nonceSize]
	ciphertext = ciphertext[nonceSize:]

	plaintext, err := aesGCM.Open(nil, aesNonce, ciphertext, nil)
	if err != nil {
		return nil, err
	}
	return plaintext, nil
}
