package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"andreabarchietto.it/password_manager/backend/env"
	keymanager "andreabarchietto.it/password_manager/backend/key_manager"
	"andreabarchietto.it/password_manager/backend/kms"
	"andreabarchietto.it/password_manager/backend/server"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/valkey-io/valkey-go"
)

func main() {
	envManager := env.NewEnvManager()
	envManager.LoadEnv(env.RequiredVariables)

	ctx := context.Background()
	connStr := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable&pool_max_conns=20",
		envManager.Get(env.PostgresUser), envManager.Get(env.PostgresPassword), envManager.Get(env.PostgresHost), envManager.Get(env.PostgresPort), envManager.Get(env.PostgresDatabase),
	)

	// 1. Connect to Postgres with Retry
	pool, err := pgxpool.New(ctx, connStr)
	if err != nil {
		log.Fatalf("❌ Failed to create Postgres pool: %v\n", err)
	}
	defer pool.Close()

	// 2. Connect to Valkey with Retry
	valkeyPool, err := valkey.NewClient(valkey.ClientOption{
		InitAddress: []string{fmt.Sprintf("%s:%s", envManager.Get(env.ValkeyHost), envManager.Get(env.ValkeyPort))},
	})

	if err != nil {
		log.Fatalf("❌ Failed to connect to Valkey: %v\n", err)
		os.Exit(1)
	}
	defer valkeyPool.Close()

	kms := kms.NewLocalKMS(
		[]byte(envManager.Get(env.CacheStorageSecret)),
		[]byte(envManager.Get(env.SessionSecret)),
		[]byte(envManager.Get(env.PostgresEncryptionSecret)),
		[]byte(envManager.Get(env.SaltSecret)),
	)

	km, err := keymanager.InitKeyManager(kms, pool, valkeyPool)
	if err != nil {
		log.Fatalf("❌ KeyManager initialization failed: %v\n", err)
		os.Exit(1)
	}

	s := server.NewServer(pool, valkeyPool, km, kms, envManager)

	http.HandleFunc("/api/signin-flow/begin", s.SignInFlowBegin)
	http.HandleFunc("/api/signin-flow/complete", s.SignInFlowComplete)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	fmt.Println("🚀 Server listening on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Fprintf(os.Stderr, "Server failed: %v\n", err)
	}
}
