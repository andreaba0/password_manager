package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"andreabarchietto.it/password_manager/backend/config"
	keymanager "andreabarchietto.it/password_manager/backend/key_manager"
	"andreabarchietto.it/password_manager/backend/server"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/valkey-io/valkey-go"
)

const (
	maxRetries = 5
	retryDelay = 2 * time.Second
)

func main() {
	dbUser := os.Getenv("DB_USER")
	dbPass := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")

	valkeyHost := os.Getenv("VALKEY_HOST")
	valkeyPort := os.Getenv("VALKEY_PORT")

	cfg := config.Config{
		IsProduction: true,
	}

	if _, ok := os.LookupEnv("APP_ENV"); ok && os.Getenv("APP_ENV") != "PROD" {
		cfg.IsProduction = false
	}

	ctx := context.Background()
	connStr := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable&pool_max_conns=20",
		dbUser, dbPass, dbHost, dbPort, dbName,
	)

	// 1. Connect to Postgres with Retry
	pool, err := connectPostgres(ctx, connStr)
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Postgres connection failed after retries: %v\n", err)
		os.Exit(1)
	}
	defer pool.Close()

	// 2. Connect to Valkey with Retry
	valkeyPool, err := connectValkey(valkeyHost, valkeyPort)
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Valkey connection failed after retries: %v\n", err)
		os.Exit(1)
	}
	defer valkeyPool.Close()

	km := keymanager.KeyManager{}

	s := &server.Server{DB: pool, ValkeyDB: valkeyPool, KeyManager: &km, Config: &cfg}

	http.HandleFunc("/api/signin-flow/begin", s.SignInFlowBegin)
	http.HandleFunc("/api/signin-flow/complete", s.SignInFlowComplete)

	fmt.Println("🚀 Server listening on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Fprintf(os.Stderr, "Server failed: %v\n", err)
	}
}

// Helper to retry Postgres connection
func connectPostgres(ctx context.Context, connStr string) (*pgxpool.Pool, error) {
	var pool *pgxpool.Pool
	var err error

	for i := 1; i <= maxRetries; i++ {
		fmt.Printf("🔄 Connecting to Postgres (Attempt %d/%d)...\n", i, maxRetries)
		pool, err = pgxpool.New(ctx, connStr)
		if err == nil {
			// pgxpool.New doesn't always guarantee an active connection immediately,
			// so we Ping the database to verify it's truly reachable.
			err = pool.Ping(ctx)
			if err == nil {
				fmt.Println("✅ Successfully connected to Postgres!")
				return pool, nil
			}
		}

		fmt.Printf("⚠️ Postgres connection failed: %v. Retrying in %v...\n", err, retryDelay)
		time.Sleep(retryDelay)
	}
	return nil, err
}

// Helper to retry Valkey connection
func connectValkey(host, port string) (valkey.Client, error) {
	var client valkey.Client
	var err error

	for i := 1; i <= maxRetries; i++ {
		fmt.Printf("🔄 Connecting to Valkey (Attempt %d/%d)...\n", i, maxRetries)
		client, err = valkey.NewClient(valkey.ClientOption{
			InitAddress: []string{fmt.Sprintf("%s:%s", host, port)},
		})

		if err == nil {
			// Execute a quick background command to verify connection life
			err = client.Do(context.Background(), client.B().Ping().Build()).Error()
			if err == nil {
				fmt.Println("✅ Successfully connected to Valkey!")
				return client, nil
			}
			client.Close() // Clean up client if ping failed
		}

		fmt.Printf("⚠️ Valkey connection failed: %v. Retrying in %v...\n", err, retryDelay)
		time.Sleep(retryDelay)
	}
	return nil, err
}
