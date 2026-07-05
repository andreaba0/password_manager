package services

import (
	"context"
	"fmt"
	"time"

	"andreabarchietto.it/password_manager/test_suite/env"
	"github.com/moby/moby/api/types/network"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

type Postgres struct {
	imageName    string
	user         string
	password     string
	port         string
	host         string
	databaseName string
	network      string
	alias        string
	container    testcontainers.Container
	exposedPort  string
}

func NewPostgres(envManager *env.EnvManager) *Postgres {
	return &Postgres{
		network:      envManager.Get(env.Network),
		alias:        envManager.Get(env.PostgresAlias),
		user:         envManager.Get(env.PostgresUser),
		password:     envManager.Get(env.PostgresPassword),
		databaseName: envManager.Get(env.PostgresDatabase),
		imageName:    envManager.Get(env.PostgresImage),
		exposedPort:  envManager.Get(env.PostgresExposedPort),
	}
}

func (p *Postgres) Create(ctx context.Context) error {
	req := testcontainers.ContainerRequest{
		Image:        p.imageName,
		ExposedPorts: []string{p.exposedPort},
		Env: map[string]string{
			"POSTGRES_USER":     p.user,
			"POSTGRES_PASSWORD": p.password,
			"POSTGRES_DB":       p.databaseName,
		},
		Networks:       []string{p.network},
		NetworkAliases: map[string][]string{p.network: {p.alias}},
		WaitingFor: wait.ForSQL(p.exposedPort, "pgx", func(host string, port network.Port) string {
			return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
				p.user, p.password, host, port.Port(), p.databaseName)
		}).WithStartupTimeout(30 * time.Second),
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		return fmt.Errorf("create postgres: %w", err)
	}
	p.container = container
	return nil
}

func (p *Postgres) Destroy(ctx context.Context) error {
	if p.container == nil {
		return nil
	}
	return p.container.Terminate(ctx)
}
