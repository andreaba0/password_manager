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
}

func NewLocalKMS(kmsStorageSecret, sessionSecret []byte) *LocalKMS {
	return &LocalKMS{
		kmsStorageSecret: kmsStorageSecret,
		sessionSecret:    sessionSecret,
	}
}

func (c *LocalKMS) SignSession(session []byte) []byte {
	mac := hmac.New(sha256.New, c.sessionSecret)
	mac.Write(session)
	return mac.Sum(nil)
}

func (c *LocalKMS) VerifySession(session, signature []byte) bool {
	mac := hmac.New(sha256.New, c.sessionSecret)
	mac.Write(session)
	return hmac.Equal(mac.Sum(nil), signature)
}

func (c *LocalKMS) EncryptCacheData(data []byte) ([]byte, error) {
	block, err := aes.NewCipher(c.kmsStorageSecret)
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
	block, err := aes.NewCipher(c.kmsStorageSecret)
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
