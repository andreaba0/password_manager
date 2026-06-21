FROM golang:1.26-alpine AS builder

# Install git and certificates (required if your app fetches private modules or makes HTTPS calls)
RUN apk update && apk add --no-cache git ca-certificates && update-ca-certificates

# Set the working directory inside the container
WORKDIR /backend

# Copy dependency manifests first (improves Docker build caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build the binary
# - CGO_ENABLED=0 builds a statically linked binary (crucial for alpine/scratch)
# - GOOS=linux ensures it targets the Linux kernel
# - -ldflags="-w -s" strips debugging information to shrink the file size
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o binary .

# ==============================================================================
# STAGE 2: Run the binary in a minimal environment
# ==============================================================================
FROM alpine:3.20

# Create a non-root user for security purposes
RUN adduser -D -g '' appuser

WORKDIR /backend

# Copy the compiled binary from the builder stage
COPY --from=builder /backend/binary .
# Copy SSL certificates so your app can securely make outbound HTTPS requests
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Run as the non-root user
USER appuser

# Expose the port your Go application listens on
EXPOSE 8080

# Run the application
CMD ["./binary"]
