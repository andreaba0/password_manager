FROM golang:1.26-alpine AS builder

# Install git and certificates (required if your app fetches private modules or makes HTTPS calls)
RUN apk update && apk add --no-cache git ca-certificates && update-ca-certificates

# Set the working directory inside the container
WORKDIR /test_suite

# Copy dependency manifests first (improves Docker build caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build the binary
# - CGO_ENABLED=0 builds a statically linked binary (crucial for alpine/scratch)
# - GOOS=linux ensures it targets the Linux kernel
# - -ldflags="-w -s" strips debugging information to shrink the file size
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o myapp .

FROM alpine:3.20
WORKDIR /test_suite
COPY --from=builder /test_suite/myapp .
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Just run the app and exit naturally
CMD ["./myapp"]
