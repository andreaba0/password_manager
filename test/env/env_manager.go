package env

import (
	"fmt"
	"os"
)

type VariableName string

var (
	PostgresUser             VariableName = "POSTGRES_USER"
	PostgresPassword         VariableName = "POSTGRES_PASSWORD"
	PostgresDatabase         VariableName = "POSTGRES_DATABASE"
	CacheStorageSecret       VariableName = "CACHE_STORAGE_SECRET"
	SessionSecret            VariableName = "SESSION_SECRET"
	SecureCookie             VariableName = "SECURE_COOKIE"
	SaltSecret               VariableName = "SALT_SECRET"
	PostgresEncryptionSecret VariableName = "POSTGRES_ENCRYPTION_SECRET"
	Network                  VariableName = "NETWORK"
	PostgresImage            VariableName = "POSTGRES_IMAGE"
	ValkeyImage              VariableName = "VALKEY_IMAGE"
	BackendImage             VariableName = "BACKEND_IMAGE"
	PostgresContainerPort    VariableName = "POSTGRES_CONTAINER_PORT"
	ValkeyContainerPort      VariableName = "VALKEY_CONTAINER_PORT"
	BackendContainerPort     VariableName = "BACKEND_CONTAINER_PORT"
)

var RequiredServiceVariables = []VariableName{
	Network,
}

var RequiredPostgresVariables = []VariableName{
	PostgresUser,
	PostgresPassword,
	PostgresDatabase,
	PostgresImage,
	PostgresContainerPort,
}

var RequiredValkeyVariables = []VariableName{
	ValkeyImage,
	ValkeyContainerPort,
}

var RequiredBackendVariables = []VariableName{
	BackendImage,
	CacheStorageSecret,
	SaltSecret,
	SecureCookie,
	PostgresEncryptionSecret,
	BackendContainerPort,
	SessionSecret,
}

type EnvManager struct {
	env map[string]string
}

func NewEnvManager() *EnvManager {
	return &EnvManager{
		env: make(map[string]string),
	}
}

func (e *EnvManager) Get(key VariableName) string {
	val, ok := e.env[string(key)]
	if !ok {
		panic(fmt.Sprintf("environment variable <%s> not found", key))
	}
	return val
}

func (e *EnvManager) LoadEnv(variableNames []VariableName) {
	for _, name := range variableNames {
		val, ok := os.LookupEnv(string(name))
		if !ok {
			panic(fmt.Sprintf("environment variable <%s> not found", string(name)))
		}
		e.env[string(name)] = val
	}
}

func (e *EnvManager) GetBool(key VariableName) bool {
	return e.Get(key) == "true"
}
