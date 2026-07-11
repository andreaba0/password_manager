package services

import (
	"context"
	"fmt"
	"net/netip"

	"github.com/testcontainers/testcontainers-go"
)

type Service interface {
	Create(ctx context.Context) error
	Destroy(ctx context.Context) error
}

func getNetworkIP(ctx context.Context, container testcontainers.Container, networkName string) netip.Addr {
	inspect, err := container.Inspect(ctx)
	if err != nil {
		panic(fmt.Sprintf("error inspecting postgres container: %v", err))
	}

	endpoint, ok := inspect.NetworkSettings.Networks[networkName]
	if !ok {
		panic(fmt.Sprintf("container is not attached to network %q", networkName))
	}

	return endpoint.IPAddress
}
