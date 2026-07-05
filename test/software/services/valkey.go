package services

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"andreabarchietto.it/password_manager/test_suite/env"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

type Valkey struct {
	imageName   string
	port        string
	host        string
	network     string
	alias       string
	container   testcontainers.Container
	exposedPort string
}

func NewValkey(envManager *env.EnvManager) *Valkey {
	return &Valkey{
		network:     envManager.Get(env.Network),
		alias:       envManager.Get(env.ValkeyAlias),
		imageName:   envManager.Get(env.PostgresImage),
		exposedPort: envManager.Get(env.PostgresExposedPort),
	}
}

func (p *Valkey) Create(ctx context.Context) error {
	req := testcontainers.ContainerRequest{
		Image:          p.imageName,
		ExposedPorts:   []string{p.exposedPort},
		Networks:       []string{p.network},
		NetworkAliases: map[string][]string{p.network: {p.alias}},
		WaitingFor: wait.ForExec([]string{"valkey-cli", "PING"}).
			WithResponseMatcher(func(body io.Reader) bool {
				data, _ := io.ReadAll(body)
				return strings.Contains(string(data), "PONG")
			}).
			WithStartupTimeout(15 * time.Second),
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		return fmt.Errorf("create valkey: %w", err)
	}
	p.container = container
	return nil
}

func (p *Valkey) Destroy(ctx context.Context) error {
	if p.container == nil {
		return nil
	}
	return p.container.Terminate(ctx)
}
