package signinflow

import (
	"context"
	"testing"

	"andreabarchietto.it/password_manager/test_suite/instances/cache"
)

func TestMain(m *testing.M) {
	cacheInstance := cache.NewCacheInstance()
	err := cacheInstance.Run(context.Background(), "", "", make(map[string]string))
	if err != nil {
		panic(err)
	}
}
