package server

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"os"
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

	cookieSecure := true
	if os.Getenv("APP_ENV") == "development" {
		cookieSecure = false
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "signInToken",
		Value:    tokenString,
		Path:     "/",
		Expires:  time.Now().Add(20 * time.Second),
		HttpOnly: true,                    // Prevents JavaScript access (Mitigates XSS)
		Secure:   cookieSecure,            // Forces HTTPS transmission
		SameSite: http.SameSiteStrictMode, // Blocks Cross-Site Request Forgery (CSRF)
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

func (s *Server) SignInFlowComplete(w http.ResponseWriter, r *http.Request) {

}
