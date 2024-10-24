#!/usr/bin/env bash

set -ex

case "$1" in
  dev|testnet|mainnet)
    echo "Deploying to $1"
    ;;
  *)
    echo "Unknown environment: $1"
    echo "Usage: $0 <dev|testnet|mainnet>"
    exit 1
    ;;
esac

CONFIG="services/rabbitmq/fly.$1.toml"

flyctl config validate \
  --access-token "$FLY_ACCESS_TOKEN_RABBITMQ" \
  --config "$CONFIG"

flyctl deploy \
  --access-token "$FLY_ACCESS_TOKEN_RABBITMQ" \
  --config "$CONFIG" \
  --dockerfile services/rabbitmq/Dockerfile \
  --build-secret RABBITMQ_USER="$RABBITMQ_USER" \
  --build-secret RABBITMQ_PASSWORD="$RABBITMQ_PASSWORD" \
  --build-secret RABBITMQ_MANAGER_USER="$RABBITMQ_MANAGER_USER" \
  --build-secret RABBITMQ_MANAGER_PASSWORD="$RABBITMQ_MANAGER_PASSWORD" \
  --ha=false \
  --remote-only
