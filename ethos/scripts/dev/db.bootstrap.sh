#!/usr/bin/env bash

set -e

# Check for verbose flag
verbose=false
if [[ "$1" == "--verbose" ]]; then
    verbose=true
fi

# Function to print messages only in verbose mode
print_verbose() {
    if $verbose; then
        echo "$1"
    fi
}

# Set correct permissions for the private key
chmod 600 ~/certs/dev/client-key.pem
print_verbose "🔒 Set permissions for client-key.pem"

# Convert PEM to P12 format
print_verbose "🔐 Converting PEM to P12 format..."
openssl pkcs12 -export -out ~/certs/dev/client-identity.p12 \
  -inkey ~/certs/dev/client-key.pem \
  -in ~/certs/dev/client-cert.pem \
  -passout pass:
print_verbose "🎉 P12 conversion complete"

# Check if PG_ETHOS_DEV_PASSWORD is set, if not, prompt for it
if [ -z "$PG_ETHOS_DEV_PASSWORD" ]; then
    echo "🔑 PG_ETHOS_DEV_PASSWORD environment variable is not set."
    echo "🔒 Please enter your PostgreSQL password (you can find it in 1password):"
    read -s PG_ETHOS_DEV_PASSWORD
    export PG_ETHOS_DEV_PASSWORD

    if [ -z "$PG_ETHOS_DEV_PASSWORD" ]; then
        echo "💥 Error: Password cannot be empty."
        exit 1
    fi
    print_verbose "🔑 Password set successfully"
else
    print_verbose "🔑 PG_ETHOS_DEV_PASSWORD already set"
fi

echo "📤 Exporting database..."

# Run pg_dump using a PostgreSQL Docker container
docker run --rm \
  -v ~/certs/dev:/certs \
  -v $(pwd):/backup \
  -e PGPASSWORD=$PG_ETHOS_DEV_PASSWORD \
  -e PGSSLMODE=require \
  -e PGSSLCERT=/certs/client-cert.pem \
  -e PGSSLKEY=/certs/client-key.pem \
  -e PGSSLROOTCERT=/certs/server-ca.pem \
  postgres:16-alpine \
  pg_dump \
    --host=34.31.16.222 \
    --username=ethos-dev \
    --dbname=ethos \
    --port=5432 \
    > ethos-bootstrap.sql

echo "🎈 Database exported to ethos-bootstrap.sql"

echo "🛑 Stopping Docker containers..."
docker compose down

echo "🔄 Starting Docker containers..."

# Check if ethos-bootstrap.sql exists
if [ ! -f "ethos-bootstrap.sql" ]; then
    echo "⚠️  ethos-bootstrap.sql not found. Unable to bootstrap database."
    exit 1
fi

# Retry mechanism
max_attempts=30
attempt=0
attempt_connection() {
    if $verbose; then
        docker exec -i ethos-db-1 psql ethos --username=postgres -c "SELECT 1"
    else
        docker exec -i ethos-db-1 psql ethos --username=postgres -c "SELECT 1" >/dev/null 2>&1
    fi
}

if $verbose; then
    docker compose up -d
else
    docker compose up -d >/dev/null 2>&1
fi

echo "⏳ Waiting for PostgreSQL to become available..."

until attempt_connection; do
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo "💥 Failed to connect to PostgreSQL after $max_attempts attempts. Exiting."
        exit 1
    fi
    print_verbose "🔄 Attempt $attempt failed. Retrying in 1 second..."
    sleep 1
done

# Execute bootstrap SQL
if $verbose; then
    docker exec -i ethos-db-1 psql ethos --username=postgres < ethos-bootstrap.sql
else
    docker exec -i ethos-db-1 psql ethos --username=postgres < ethos-bootstrap.sql >/dev/null 2>&1
fi

echo "🎉 Database bootstrap completed successfully."
