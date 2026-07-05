package services

import (
	"context"
	"fmt"

	"andreabarchietto.it/password_manager/test_suite/env"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

type Backend struct {
	container testcontainers.Container
	network   string
	dbDSN     string

	host, port  string
	exposedPort string
	imageName   string
}

func NewBackend(envManager *env.EnvManager) *Backend {
	return &Backend{
		network:   envManager.Get(env.Network),
		dbDSN:     envManager.Get(env.PostgresAlias),
		imageName: envManager.Get(env.BackendImage),
		host:      envManager.Get(env.BackendHost),
		port:      envManager.Get(env.BackendPort),
	}
}

func (b *Backend) Create(ctx context.Context) error {
	req := testcontainers.ContainerRequest{
		FromDockerfile: testcontainers.FromDockerfile{
			Context:    "..", // path to repo root relative to test_suite package
			Dockerfile: "Dockerfile",
		},
		ExposedPorts: []string{"8080/tcp"},
		Env: map[string]string{
			"DATABASE_URL": b.dbDSN, // use InternalDSN() from Postgres here
		},
		Networks:   []string{b.network},
		WaitingFor: wait.ForHTTP("/health").WithPort("8080/tcp"),
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

func (b *Backend) Run(ctx context.Context) error {
	if b.container == nil {
		if err := b.Create(ctx); err != nil {
			return err
		}
	}
	host, err := b.container.Host(ctx)
	if err != nil {
		return err
	}
	port, err := b.container.MappedPort(ctx, "8080")
	if err != nil {
		return err
	}
	b.host, b.port = host, port.Port()
	return nil
}

func (b *Backend) Destroy(ctx context.Context) error {
	if b.container == nil {
		return nil
	}
	return b.container.Terminate(ctx)
}

func (b *Backend) BaseURL() string {
	return fmt.Sprintf("http://%s:%s", b.host, b.port)
}
