package services

import (
	"context"
	"fmt"
	"time"

	"andreabarchietto.it/password_manager/test_suite/env"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

type Postgres struct {
	container testcontainers.Container
	env       *env.EnvManager
	pool      *pgxpool.Pool
	hostname  string
}

func NewPostgres(envManager *env.EnvManager, hostname string) *Postgres {
	return &Postgres{
		container: nil,
		env:       envManager,
		pool:      nil,
		hostname:  hostname,
	}
}

func (p *Postgres) Create(ctx context.Context) error {
	req := testcontainers.ContainerRequest{
		Image: p.env.Get(env.PostgresImage),
		Env: map[string]string{
			"POSTGRES_USER":     p.env.Get(env.PostgresUser),
			"POSTGRES_PASSWORD": p.env.Get(env.PostgresPassword),
			"POSTGRES_DB":       p.env.Get(env.PostgresDatabase),
		},
		Networks:       []string{p.env.Get(env.Network)},
		NetworkAliases: map[string][]string{p.env.Get(env.Network): {p.hostname}},
		WaitingFor: wait.ForExec([]string{
			"pg_isready",
			"-U",
			p.env.Get(env.PostgresUser),
			"-d",
			p.env.Get(env.PostgresDatabase),
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

func (p *Postgres) GetClient(ctx context.Context, sameNetwork bool) *pgxpool.Pool {
	if p.pool != nil {
		return p.pool
	}

	host := ""
	if sameNetwork {
		host = p.hostname
	} else {
		netipAddr := getNetworkIP(ctx, p.container, p.env.Get(env.Network))
		host = netipAddr.String()
	}

	connString := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		p.env.Get(env.PostgresUser),
		p.env.Get(env.PostgresPassword),
		host,
		p.env.Get(env.PostgresContainerPort),
		p.env.Get(env.PostgresDatabase),
	)

	var pool *pgxpool.Pool

	var err error
	pool, err = pgxpool.New(ctx, connString)
	if err != nil {
		panic(fmt.Sprintf("Error creating postgres pool: %v", err))
	}

	p.pool = pool
	return p.pool
}

func (p *Postgres) GetClientPublic(ctx context.Context) *pgxpool.Pool {
	return p.GetClient(ctx, false)
}

func (p *Postgres) GetClientPrivate(ctx context.Context) *pgxpool.Pool {
	return p.GetClient(ctx, true)
}
