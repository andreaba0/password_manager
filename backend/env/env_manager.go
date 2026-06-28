package env

import (
	"fmt"
	"os"
)

type VariableName string

var (
	PostgresHost             VariableName = "POSTGRES_HOST"
	PostgresPort             VariableName = "POSTGRES_PORT"
	PostgresUser             VariableName = "POSTGRES_USER"
	PostgresPassword         VariableName = "POSTGRES_PASSWORD"
	PostgresDatabase         VariableName = "POSTGRES_DATABASE"
	ValkeyHost               VariableName = "VALKEY_HOST"
	ValkeyPort               VariableName = "VALKEY_PORT"
	CacheStorageSecret       VariableName = "CACHE_STORAGE_SECRET"
	SessionSecret            VariableName = "SESSION_SECRET"
	SecureCookie             VariableName = "SECURE_COOKIE"
	SaltSecret               VariableName = "SALT_SECRET"
	PostgresEncryptionSecret VariableName = "POSTGRES_ENCRYPTION_SECRET"
)

var RequiredVariables = []VariableName{
	PostgresHost,
	PostgresPort,
	PostgresUser,
	PostgresPassword,
	PostgresDatabase,
	ValkeyHost,
	ValkeyPort,
	CacheStorageSecret,
	SessionSecret,
	SecureCookie,
	SaltSecret,
	PostgresEncryptionSecret,
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
