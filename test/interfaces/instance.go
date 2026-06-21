package interfaces

import "context"

type InstanceInterface interface {
	Run(ctx context.Context, dockerfilePath string, networkName string, env map[string]string) error
}
