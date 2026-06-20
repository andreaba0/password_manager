package main

import (
	"context"
	"fmt"
	"net/http"
	"os"

	"andreabarchietto.it/password_manager/backend/server"
	"github.com/jackc/pgx/v5/pgxpool"
)

func SigninFlowBegin(w http.ResponseWriter, r *http.Request) {

}

func main() {
	dbUser := os.Getenv("DB_USER")
	dbPass := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")
	ctx := context.Background()
	connStr := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable&pool_max_conns=20",
		dbUser, dbPass, dbHost, dbPort, dbName,
	)

	// Create the connection pool
	pool, err := pgxpool.New(ctx, connStr)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to create connection pool: %v\n", err)
		os.Exit(1)
	}
	defer pool.Close()

	s := &server.Server{DB: pool}

	// The following method return a json object with {salt,nonce}
	http.HandleFunc("/api/signin-flow/begin", s.SignInFlowBegin)

	// The following method completes the signin process by verifying nonce signature from the client
	http.HandleFunc("/api/signin-flow/complete", s.SignInFlowComplete)

	http.ListenAndServe(":8080", nil)
}
