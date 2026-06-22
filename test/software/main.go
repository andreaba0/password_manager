package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

// Service defines the structure for our build targets
type Service struct {
	Name           string
	DockerfilePath string
	ContextPath    string
}

func main() {
	// Define the services based on your directory structure
	services := []Service{
		{Name: "backend", DockerfilePath: "../../backend/Dockerfile", ContextPath: "../../backend"},
		{Name: "cache", DockerfilePath: "../../cache/Dockerfile", ContextPath: "../../cache"},
		{Name: "database", DockerfilePath: "../../database/Dockerfile", ContextPath: "../../database"},
	}

	reader := bufio.NewReader(os.Stdin)

	for {
		fmt.Println("\n====================================")
		fmt.Println("    Docker Build Management Menu")
		fmt.Println("====================================")
		for i, svc := range services {
			fmt.Printf("[%d] Build %s\n", i+1, svc.Name)
		}
		fmt.Printf("[%d] Build ALL instances\n", len(services)+1)
		fmt.Println("[Q] Quit")
		fmt.Print("Choose an option: ")

		input, err := reader.ReadString('\n')
		if err != nil {
			fmt.Println("Error reading input:", err)
			continue
		}

		input = strings.TrimSpace(strings.ToLower(input))

		if input == "q" {
			fmt.Println("Exiting. Goodbye!")
			break
		}

		// Handle "Build ALL" choice
		if input == fmt.Sprintf("%d", len(services)+1) {
			fmt.Println("\nStarting build for ALL services...")
			for _, svc := range services {
				buildImage(svc)
			}
			continue
		}

		// Handle individual service choices
		var choice int
		_, err = fmt.Sscanf(input, "%d", &choice)
		if err != nil || choice < 1 || choice > len(services) {
			fmt.Println("❌ Invalid choice. Please select a valid option.")
			continue
		}

		// Run build for the selected service
		selectedService := services[choice-1]
		buildImage(selectedService)
	}
}

func buildImage(svc Service) {
	// Generate UTC timestamp tag (Format: YYYYMMDDHHMMSS)
	timestamp := time.Now().UTC().Format("20060102150405")
	timestampTag := fmt.Sprintf("%s:%s", svc.Name, timestamp)
	latestTag := fmt.Sprintf("%s:latest", svc.Name)

	fmt.Printf("\n🚀 Starting build for [%s]...\n", svc.Name)
	fmt.Printf("📦 Tags: %s and %s\n", timestampTag, latestTag)

	// Construct the docker build command
	// We use -t multiple times to apply both tags in a single build pass
	cmd := exec.Command("docker", "build",
		"-f", svc.DockerfilePath,
		"-t", timestampTag,
		"-t", latestTag,
		svc.ContextPath,
	)

	// Stream stdout and stderr directly to the terminal so the user sees progress or errors
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	// Run the command and catch failures
	err := cmd.Run()
	if err != nil {
		fmt.Printf("\n❌ Build failed for %s! Error: %v\n", svc.Name, err)
		return
	}

	fmt.Printf("\n✅ Successfully built and tagged %s!\n", svc.Name)
}
