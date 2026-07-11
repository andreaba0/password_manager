package services

import (
	"context"
	"fmt"
	"net/http"

	"andreabarchietto.it/password_manager/test_suite/env"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

type Backend struct {
	container        testcontainers.Container
	env              *env.EnvManager
	postgresHostname string
	valkeyHostname   string
	hostname         string
}

func NewBackend(envManager *env.EnvManager, hostname string, postgresHostname string, valkeyHostname string) *Backend {
	return &Backend{
		env:              envManager,
		hostname:         hostname,
		postgresHostname: postgresHostname,
		valkeyHostname:   valkeyHostname,
	}
}

func (b *Backend) Create(ctx context.Context) error {
	var i int
	req := testcontainers.ContainerRequest{
		Image: b.env.Get(env.BackendImage),
		Env: map[string]string{
			"POSTGRES_HOST":              b.postgresHostname,
			"POSTGRES_PORT":              b.env.Get(env.PostgresContainerPort),
			"POSTGRES_USER":              b.env.Get(env.PostgresUser),
			"POSTGRES_PASSWORD":          b.env.Get(env.PostgresPassword),
			"POSTGRES_DATABASE":          b.env.Get(env.PostgresDatabase),
			"VALKEY_HOST":                b.valkeyHostname,
			"VALKEY_PORT":                b.env.Get(env.ValkeyContainerPort),
			"CACHE_STORAGE_SECRET":       b.env.Get(env.CacheStorageSecret),
			"SESSION_SECRET":             b.env.Get(env.SessionSecret),
			"SECURE_COOKIE":              b.env.Get(env.SecureCookie),
			"SALT_SECRET":                b.env.Get(env.SaltSecret),
			"POSTGRES_ENCRYPTION_SECRET": b.env.Get(env.PostgresEncryptionSecret),
		},
		Networks: []string{b.env.Get(env.Network)},
		WaitingFor: wait.ForHTTP("/health").WithPort(b.env.Get(env.BackendContainerPort)).WithStatusCodeMatcher(func(status int) bool {
			i++ // always fail the first try in order to force the polling loop to be re-run
			return i > 1 && status == http.StatusNoContent
		}),
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		return fmt.Errorf("create backend: %w", err)
	}
	b.container = container
	return nil
}

func (b *Backend) Destroy(ctx context.Context) error {
	if b.container == nil {
		return nil
	}
	return b.container.Terminate(ctx)
}

func (b *Backend) getClient(ctx context.Context, sameNetwork bool) string {
	host := ""
	if sameNetwork {
		host = b.hostname
	} else {
		netipAddr := getNetworkIP(ctx, b.container, b.env.Get(env.Network))
		host = netipAddr.String()
	}

	url := fmt.Sprintf(
		"http://%s:%s",
		host,
		b.env.Get(env.BackendContainerPort),
	)

	return url
}

func (b *Backend) GetClientPublic(ctx context.Context) string {
	return b.getClient(ctx, false)
}

func (b *Backend) GetClientSameNetwork(ctx context.Context) string {
	return b.getClient(ctx, true)
}
