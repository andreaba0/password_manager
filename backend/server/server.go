package server

import (
	"encoding/hex"
	"encoding/json"
	"net/http"

	"andreabarchietto.it/password_manager/backend/utils"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Server struct {
	DB *pgxpool.Pool
}

type SignInFlowBeginRequest struct {
	Email string `json:"email"`
}
type SignInFlowBeginResponse struct {
	Nonce string `json:"nonce"`
	Salt  string `json:"salt"`
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

	// Query database to get salt for user by email
	// If user is not found, generate a salt from hmac-sha256(email, secret from env)
	var salt []byte
	err = s.DB.QueryRow(r.Context(), "SELECT salt FROM users WHERE email = $1", req.Email).Scan(&salt)
	if err == nil {
		resp := SignInFlowBeginResponse{
			Nonce: hex.EncodeToString(nonce),
			Salt:  hex.EncodeToString(salt),
		}
		w.Header().Set("Content-Type", "application/json")
		err = json.NewEncoder(w).Encode(resp)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		return
	}
	if err != pgx.ErrNoRows {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	salt = utils.GenerateSaltFromEmail(req.Email)
	resp := SignInFlowBeginResponse{
		Nonce: hex.EncodeToString(nonce),
		Salt:  hex.EncodeToString(salt),
	}
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(resp)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func (s *Server) SignInFlowComplete(w http.ResponseWriter, r *http.Request) {

}
