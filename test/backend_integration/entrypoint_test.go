package backend_integration

import (
	"context"
	"log"
	"os"
	"testing"

	"andreabarchietto.it/password_manager/test_suite/env"
	"andreabarchietto.it/password_manager/test_suite/services"
	"andreabarchietto.it/password_manager/test_suite/utils"
)

var (
	PostgresService  *services.Postgres
	ValkeyService    *services.Valkey
	BackendService   *services.Backend
	PostgresHostname string
	ValkeyHostname   string
	BackendHostname  string
)

var (
	envManager *env.EnvManager
)

func TestMain(m *testing.M) {

	// Preload environment variables and throw an error if any are missing
	var currentEnvironmentVariables []env.VariableName
	currentEnvironmentVariables = append(currentEnvironmentVariables, env.RequiredPostgresVariables...)
	currentEnvironmentVariables = append(currentEnvironmentVariables, env.RequiredServiceVariables...)
	currentEnvironmentVariables = append(currentEnvironmentVariables, env.RequiredValkeyVariables...)
	currentEnvironmentVariables = append(currentEnvironmentVariables, env.RequiredBackendVariables...)
	envManager = env.NewEnvManager()
	envManager.LoadEnv(currentEnvironmentVariables)

	PostgresHostname = utils.GetRandomName()
	ValkeyHostname = utils.GetRandomName()
	BackendHostname = utils.GetRandomName()

	PostgresService = services.NewPostgres(envManager, PostgresHostname)
	ValkeyService = services.NewValkey(envManager, ValkeyHostname)
	BackendService = services.NewBackend(envManager, BackendHostname, PostgresHostname, ValkeyHostname)

	tierup(PostgresService, ValkeyService, BackendService)
	m.Run()
	tierdown(PostgresService, ValkeyService, BackendService)

	os.Exit(0)
}

func tierup(services ...services.Service) {
	for _, service := range services {
		err := service.Create(context.Background())
		if err != nil {
			log.Printf("There was an error creating container: %v", err)
		}
	}
}

func tierdown(services ...services.Service) {
	for _, service := range services {
		_ = service.Destroy(context.Background())
	}
}
