#!/usr/bin/env bash

set -ex

# Run all the services defined in docker-compose.yml
docker compose up -d

# Build packages
npm run build:packages

# Start the server and watch for packages updates
npx tsx scripts/start-dev.ts
