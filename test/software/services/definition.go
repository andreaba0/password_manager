package services

type Service interface {
	Run() error
	HealthCheck() error
	Destroy() error
	Connect() error
}
