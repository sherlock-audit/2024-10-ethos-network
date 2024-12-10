#!/usr/bin/env bash

set -e

ethos_bootstrap_sql_path=".cache/ethos-bootstrap.sql"
emporos_bootstrap_sql_path=".cache/emporos-bootstrap.sql"

mkdir -p .cache

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
  -v "$(pwd)":/backup \
  -e PGPASSWORD="$PG_ETHOS_DEV_PASSWORD" \
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
    > $ethos_bootstrap_sql_path

echo "🎈 Database echo exported to $ethos_bootstrap_sql_path"

docker run --rm \
  -v ~/certs/dev:/certs \
  -v "$(pwd)":/backup \
  -e PGPASSWORD="$PG_ETHOS_DEV_PASSWORD" \
  -e PGSSLMODE=require \
  -e PGSSLCERT=/certs/client-cert.pem \
  -e PGSSLKEY=/certs/client-key.pem \
  -e PGSSLROOTCERT=/certs/server-ca.pem \
  postgres:16-alpine \
  pg_dump \
    --host=34.31.16.222 \
    --username=ethos-dev \
    --dbname=emporos \
    --port=5432 \
    > $emporos_bootstrap_sql_path

echo "🎈 Database emporos exported to $emporos_bootstrap_sql_path"

echo "🛑 Stopping Docker containers..."
docker compose down

echo "🔄 Starting Docker containers..."

# Check if ethos-bootstrap.sql exists
if [ ! -f $ethos_bootstrap_sql_path ]; then
    echo "⚠️  $ethos_bootstrap_sql_path not found. Unable to bootstrap database."
    exit 1
fi

# Check if emporos-bootstrap.sql exists
if [ ! -f $emporos_bootstrap_sql_path ]; then
    echo "⚠️  $emporos_bootstrap_sql_path not found. Unable to bootstrap database."
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
    docker exec -i ethos-db-1 psql ethos --username=postgres < $ethos_bootstrap_sql_path
else
    docker exec -i ethos-db-1 psql ethos --username=postgres < $ethos_bootstrap_sql_path >/dev/null 2>&1
fi

if $verbose; then
    docker exec -i ethos-db-1 psql --username=postgres -c "CREATE DATABASE emporos;"
    docker exec -i ethos-db-1 psql emporos --username=postgres < $emporos_bootstrap_sql_path
else
    docker exec -i ethos-db-1 psql --username=postgres -c "CREATE DATABASE emporos;" >/dev/null 2>&1
    docker exec -i ethos-db-1 psql emporos --username=postgres < $emporos_bootstrap_sql_path >/dev/null 2>&1
fi

SQL_TRUNCATE_USER_FCM_TOKENS="TRUNCATE TABLE user_fcm_tokens RESTART IDENTITY;"

# Execute SQL to drop all user FCM tokens to ensure that we are not sending push
# notifications to everyone who set up notifications on dev. Otherwise, everyone
# who run this script, has a copy of tokens locally and whenever there's a new
# activity, every locally running instance of echo sends a push notification
# spamming the receiver with duplicates.
if $verbose; then
    docker exec -i ethos-db-1 psql ethos --username=postgres -c "$SQL_TRUNCATE_USER_FCM_TOKENS"
else
    docker exec -i ethos-db-1 psql ethos --username=postgres -c "$SQL_TRUNCATE_USER_FCM_TOKENS" >/dev/null 2>&1
fi

echo "🎉 Database bootstrap completed successfully."
