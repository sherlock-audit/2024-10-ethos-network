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

NEXT_PUBLIC_VERSION="ethos-web@$1-${GITHUB_SHA:0:8}-$GITHUB_RUN_NUMBER"
CONFIG="services/web/fly.$1.toml"

flyctl config validate \
  --access-token "$FLY_ACCESS_TOKEN_WEB" \
  --config "$CONFIG"

flyctl deploy \
  --depot="${ENABLE_DEPOT_BUILDER:=true}" \
  --access-token "$FLY_ACCESS_TOKEN_WEB" \
  --config "$CONFIG" \
  --dockerfile services/web/Dockerfile \
  --build-arg CI="$CI" \
  --build-arg GITHUB_RUN_NUMBER="$GITHUB_RUN_NUMBER" \
  --build-arg NEXT_PUBLIC_ETHOS_ENV="$1" \
  --build-arg NEXT_PUBLIC_VERSION="$NEXT_PUBLIC_VERSION" \
  --build-arg SENTRY_ENABLED="$SENTRY_ENABLED" \
  --build-secret SENTRY_AUTH_TOKEN="$SENTRY_AUTH_TOKEN" \
  --remote-only
