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

EMPOROS_PUBLIC_VERSION="ethos-emporos@$1-${GITHUB_SHA:0:8}-$GITHUB_RUN_NUMBER"
CONFIG="services/emporos/deploy/fly.$1.toml"

flyctl config validate \
  --access-token "$FLY_ACCESS_TOKEN_EMPOROS" \
  --config "$CONFIG"

flyctl deploy \
  --access-token "$FLY_ACCESS_TOKEN_EMPOROS" \
  --config "$CONFIG" \
  --dockerfile services/emporos/Dockerfile \
  --build-arg CI="$CI" \
  --build-arg GITHUB_RUN_NUMBER="$GITHUB_RUN_NUMBER" \
  --build-arg EMPOROS_PUBLIC_VERSION="$EMPOROS_PUBLIC_VERSION" \
  --build-secret SENTRY_AUTH_TOKEN="$SENTRY_AUTH_TOKEN" \
  --remote-only
