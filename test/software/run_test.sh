#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Check if a package path argument was provided
if [ -z "$1" ]; then
    echo "❌ Error: Missing package path."
    echo "Usage: ./run_test.sh <package-path>"
    echo "Example: ./run_test.sh ./internal/auth/..."
    exit 1
fi

PACKAGE_PATH="$1"

# ==============================================================================
# INTEGRATION TEST ENVIRONMENT VARIABLES
# ==============================================================================
# These match the ports exposed to localhost in your docker-compose config
DB_USER="test_user"
DB_PASSWORD="test_password"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="test_db"

VALKEY_HOST="localhost"
VALKEY_PORT="6379"

APP_ENV="TESTING"
# ==============================================================================

echo "🚀 Running integration tests for: $PACKAGE_PATH"
echo "🔄 Connecting to infrastructure at localhost..."

# Run the go test command inline with the environment variables
DB_USER="$DB_USER" \
DB_PASSWORD="$DB_PASSWORD" \
DB_HOST="$DB_HOST" \
DB_PORT="$DB_PORT" \
DB_NAME="$DB_NAME" \
VALKEY_HOST="$VALKEY_HOST" \
VALKEY_PORT="$VALKEY_PORT" \
VALKEY_PASSWORD="$VALKEY_PASSWORD" \
APP_ENV="$APP_ENV" \
go test -v -count=1 "$PACKAGE_PATH"
