package cache

import (
	"bytes"
	"context"
	"fmt"
	"regexp"
	"slices"

	"github.com/testcontainers/testcontainers-go"
)

type CacheInstance struct {
	container   testcontainers.Container
	networkName string
}

// NewCacheInstance builds and starts the container without blocking on ready states.
func NewCacheInstance() *CacheInstance {
	return &CacheInstance{}
}

func (c *CacheInstance) Run(ctx context.Context, dockerfilePath string, networkName string, env map[string]string) error {
	c.networkName = networkName

	req := testcontainers.ContainerRequest{
		FromDockerfile: testcontainers.FromDockerfile{
			Context:    dockerfilePath,
			Dockerfile: "Dockerfile",
		},
		ExposedPorts: []string{"6379/tcp"},
		Networks:     []string{networkName},
		Env:          env,
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true, // Tells testcontainers to launch it right now
	})
	if err != nil {
		return fmt.Errorf("failed to run container: %w", err)
	}

	c.container = container
	return nil
}

// IsRunning inspects the container state directly from the Docker daemon
func (c *CacheInstance) IsRunning(ctx context.Context) bool {
	state, err := c.container.State(ctx)
	if err != nil {
		return false
	}
	return state.Running
}

// IsNetworkAssigned checks if the container is actively attached to your network
func (c *CacheInstance) IsNetworkAssigned(ctx context.Context) bool {
	networks, err := c.container.Networks(ctx)
	if err != nil {
		return false
	}
	return slices.Contains(networks, c.networkName)
}

// InstanceIsListening execs redis-cli inside the container and verifies the output via regex
func (c *CacheInstance) InstanceIsListening(ctx context.Context) bool {
	// Execute the command inside the container
	exitCode, stdoutReader, err := c.container.Exec(ctx, []string{"valkey-cli", "ping"})
	if err != nil || exitCode != 0 {
		return false
	}

	// Read output
	var buf bytes.Buffer
	_, err = buf.ReadFrom(stdoutReader)
	if err != nil {
		return false
	}

	// Use regex to look for "PONG" (case-insensitive, accommodating potential newlines)
	matched, _ := regexp.MatchString(`(?i)PONG`, buf.String())
	return matched
}

// Close kills the container when tests are finished
func (c *CacheInstance) Close(ctx context.Context) error {
	if c.container != nil {
		return c.container.Terminate(ctx)
	}
	return nil
}
