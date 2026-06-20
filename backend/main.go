package main

import (
	"context"
	"fmt"
	"net/http"
	"os"

	"andreabarchietto.it/password_manager/backend/config"
	keymanager "andreabarchietto.it/password_manager/backend/key_manager"
	"andreabarchietto.it/password_manager/backend/server"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/valkey-io/valkey-go"
)

func main() {
	dbUser := os.Getenv("DB_USER")
	dbPass := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")

	// Now Valkey connection data
	valkeyHost := os.Getenv("VALKEY_HOST")
	valkeyPort := os.Getenv("VALKEY_PORT")
	valkeyPassword := os.Getenv("VALKEY_PASSWORD")

	config := config.Config{
		IsProduction: true,
	}

	if _, ok := os.LookupEnv("APP_ENV"); ok && os.Getenv("APP_ENV") != "PROD" {
		config.IsProduction = false
	}

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

	// Create the Valkey connection pool
	valkeyPool, err := valkey.NewClient(valkey.ClientOption{
		InitAddress: []string{fmt.Sprintf("%s:%s", valkeyHost, valkeyPort)},
		Password:    valkeyPassword,
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to create Valkey connection pool: %v\n", err)
		os.Exit(1)
	}
	defer valkeyPool.Close()

	km := keymanager.KeyManager{}

	s := &server.Server{DB: pool, ValkeyDB: valkeyPool, KeyManager: &km, Config: &config}

	// The following method return a json object with {salt,nonce}
	http.HandleFunc("/api/signin-flow/begin", s.SignInFlowBegin)

	// The following method completes the signin process by verifying nonce signature from the client
	http.HandleFunc("/api/signin-flow/complete", s.SignInFlowComplete)

	http.ListenAndServe(":8080", nil)

}
