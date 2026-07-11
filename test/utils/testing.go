package utils

import (
	"context"
	"testing"

	"andreabarchietto.it/password_manager/test_suite/services"
)

func TestingCallbackClearEnvironment(t *testing.T, context context.Context, postgresService *services.Postgres, valkeyService *services.Valkey, fn func()) {

	valkeyClient := valkeyService.GetClientPublic(context)
	postgresPool := postgresService.GetClientPublic(context)

	clearEnvironment := func(t *testing.T) {
		// Clear PostgreSQL
		_, err := postgresPool.Exec(context, ClearAllDatabaseRows)
		if err != nil {
			t.Fatalf("failed to clear postgres database: %v", err)
		}

		// Clear Valkey
		err = valkeyClient.Do(context, valkeyClient.B().Flushall().Build()).Error()
		if err != nil {
			t.Fatalf("failed to clear valkey cache: %v", err)
		}
	}

	t.Cleanup(func() {
		clearEnvironment(t)
	})
	clearEnvironment(t)

	fn()
}
