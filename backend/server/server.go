package server

import (
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"andreabarchietto.it/password_manager/backend/config"
	keymanager "andreabarchietto.it/password_manager/backend/key_manager"
	"andreabarchietto.it/password_manager/backend/utils"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/valkey-io/valkey-go"
)

type Server struct {
	DB         *pgxpool.Pool
	ValkeyDB   valkey.Client
	KeyManager *keymanager.KeyManager
	Config     *config.Config
}

type SignInFlowBeginRequest struct {
	Email string `json:"email"`
}
type SignInFlowBeginResponse struct {
	Nonce string `json:"nonce"`
	Salt  string `json:"salt"`
}
type SignInFlowJsonWebToken struct {
	Email     string `json:"email"`
	Nonce     string `json:"nonce"`
	Salt      string `json:"salt"`
	SessionId string `json:"sessionId"`
	jwt.RegisteredClaims
}

func (s *Server) SignInFlowBegin(w http.ResponseWriter, r *http.Request) {
	var req SignInFlowBeginRequest
	if err := utils.DecodeRequest(r, &req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	nonce, err := utils.GenerateNonce()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	sessionId, err := utils.GenerateSessionID()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Query database to get salt for user by email
	// If user is not found, generate a salt from hmac-sha256(email, secret from env)
	var salt []byte
	err = s.DB.QueryRow(r.Context(), "SELECT salt FROM users WHERE email = $1", req.Email).Scan(&salt)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err != nil && errors.Is(err, pgx.ErrNoRows) {
		salt = utils.GenerateSaltFromEmail(req.Email)
	}

	key, id, err := s.KeyManager.GetEncryption()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	claims := SignInFlowJsonWebToken{
		Email:     req.Email,
		Nonce:     hex.EncodeToString(nonce),
		Salt:      string(salt),
		SessionId: hex.EncodeToString(sessionId),
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(20 * time.Second)),
			Issuer:    "andreabarchietto.it/password_manager",
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(&jwt.SigningMethodEd25519{}, claims)
	token.Header["kid"] = id

	privateKey, err := jwt.ParseEdPrivateKeyFromPEM(key)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// send jwt token
	tokenString, err := token.SignedString(privateKey)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "signInToken",
		Value:    tokenString,
		Path:     "/",
		Expires:  time.Now().Add(20 * time.Second),
		HttpOnly: true,                          // Prevents JavaScript access (Mitigates XSS)
		Secure:   s.Config.IsProduction == true, // Forces HTTPS transmission
		SameSite: http.SameSiteStrictMode,       // Blocks Cross-Site Request Forgery (CSRF)
	})

	resp := map[string]string{
		"nonce": hex.EncodeToString(nonce),
		"salt":  hex.EncodeToString(salt),
	}
	respBytes, err := json.Marshal(resp)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write(respBytes)
}

type SignInFlowCompleteRequest struct {
	Signature string `json:"signature"` // Hex-encoded cryptographic signature from client
}

func (s *Server) SignInFlowComplete(w http.ResponseWriter, r *http.Request) {
	// 1. Decode the incoming JSON request payload
	var req SignInFlowCompleteRequest
	if err := utils.DecodeRequest(r, &req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	sigBytes, err := hex.DecodeString(req.Signature)
	if err != nil {
		http.Error(w, "Invalid signature encoding", http.StatusBadRequest)
		return
	}

	// 2. Extract the JWT from the HttpOnly Cookie
	cookie, err := r.Cookie("signInToken")
	if err != nil {
		http.Error(w, "Sign-in session expired or missing", http.StatusUnauthorized)
		return
	}
	tokenStr := cookie.Value

	// 3. Parse and Verify the JWT using the KeyManager public keys
	var claims SignInFlowJsonWebToken
	token, err := jwt.ParseWithClaims(tokenStr, &claims, func(t *jwt.Token) (interface{}, error) {
		// Ensure the signing method matches what you generated in step 1
		if _, ok := t.Method.(*jwt.SigningMethodEd25519); !ok && t.Method.Alg() != jwt.SigningMethodEdDSA.Alg() {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}

		// Pull the Key ID out of the JWT header
		kid, ok := t.Header["kid"].(string)
		if !ok {
			return nil, errors.New("missing kid header")
		}

		// Fetch the public validation key bytes from your KeyManager cache
		pubKeyBytes, found := s.KeyManager.GetKey(kid)
		if !found {
			return nil, errors.New("invalid or rotated key id")
		}

		// Parse the public key from PEM
		return jwt.ParseEdPublicKeyFromPEM(pubKeyBytes)
	})

	if err != nil || !token.Valid {
		http.Error(w, "Invalid login token payload", http.StatusUnauthorized)
		return
	}

	// Decode the original nonce from the JWT claims
	nonceBytes, err := hex.DecodeString(claims.Nonce)
	if err != nil {
		http.Error(w, "Corrupted session state", http.StatusInternalServerError)
		return
	}

	// 4. Query the Database for the User's master Public Key
	var userPubKeyHex string
	err = s.DB.QueryRow(r.Context(), "SELECT public_key FROM users WHERE email = $1", claims.Email).Scan(&userPubKeyHex)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "Database failure", http.StatusInternalServerError)
		return
	}
	if err != nil && errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	userPubKeyBytes, err := hex.DecodeString(userPubKeyHex)
	if err != nil || len(userPubKeyBytes) != ed25519.PublicKeySize {
		http.Error(w, "Invalid server identity layout", http.StatusInternalServerError)
		return
	}
	userPublicKey := ed25519.PublicKey(userPubKeyBytes)

	// 5. Verify the client's signature against the original Nonce bytes
	// ed25519.Verify takes: (PublicKey, originalMessage, signature)
	if !ed25519.Verify(userPublicKey, nonceBytes, sigBytes) {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// 6. Access Granted! Save the full session state into Valkey
	// Key: session:<sessionIdHex>, Value: email string (or JSON metadata)
	valkeyKey := fmt.Sprintf("session:%s", claims.SessionId)

	cmd := s.ValkeyDB.B().Set().Key(valkeyKey).Value(claims.Email).Nx().Ex(15 * 3600).Build()
	err = s.ValkeyDB.Do(r.Context(), cmd).Error()
	if err != nil && valkey.IsValkeyNil(err) {
		http.Error(w, "Sesion already established", http.StatusConflict)
	}
	if err != nil && !valkey.IsValkeyNil(err) {
		http.Error(w, "Cache session allocation failure", http.StatusInternalServerError)
		return
	}

	// 7. Clear the temporary authentication sign-in cookie by overriding it with an expired time
	http.SetCookie(w, &http.Cookie{
		Name:     "signInToken",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   s.Config.IsProduction == true,
		SameSite: http.SameSiteStrictMode,
	})

	// 8. Write a generic success response or return a permanent active session cookie
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Authentication Successful"))
}
