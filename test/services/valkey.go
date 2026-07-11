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
	"github.com/valkey-io/valkey-go"
)

type Valkey struct {
	container testcontainers.Container
	env       *env.EnvManager
	client    valkey.Client
	hostname  string
}

func NewValkey(envManager *env.EnvManager, hostname string) *Valkey {
	return &Valkey{
		container: nil,
		env:       envManager,
		client:    nil,
		hostname:  hostname,
	}
}

func (p *Valkey) Create(ctx context.Context) error {
	req := testcontainers.ContainerRequest{
		Image:          p.env.Get(env.ValkeyImage),
		Networks:       []string{p.env.Get(env.Network)},
		NetworkAliases: map[string][]string{p.env.Get(env.Network): {p.hostname}},
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

func (v *Valkey) getClient(ctx context.Context, sameNetwork bool) valkey.Client {
	if v.client != nil {
		return v.client
	}

	host := ""
	if sameNetwork {
		host = v.hostname
	} else {
		netipAddr := getNetworkIP(ctx, v.container, v.env.Get(env.Network))
		host = netipAddr.String()
	}

	address := fmt.Sprintf("%s:%s", host, v.env.Get(env.ValkeyContainerPort))

	client, err := valkey.NewClient(valkey.ClientOption{
		InitAddress: []string{address},
	})
	if err != nil {
		panic(fmt.Sprintf("Error creating valkey client: %v", err))
	}

	v.client = client

	return v.client
}

func (v *Valkey) GetClientPublic(ctx context.Context) valkey.Client {
	return v.getClient(ctx, false)
}

func (v *Valkey) GetClientPrivate(ctx context.Context) valkey.Client {
	return v.getClient(ctx, true)
}
