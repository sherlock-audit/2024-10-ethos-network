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

PREFIX=""
if [ -n "$IS_MANUAL_DEPLOYMENT" ]; then
  PREFIX="manual-"
fi
DEPLOYMENT_ID="${PREFIX}$GITHUB_RUN_ID-$GITHUB_REF_NAME-${GITHUB_SHA:0:8}"
echo "deploymentId: $DEPLOYMENT_ID"

CONFIG="services/echo/fly.$1.toml"

flyctl config validate \
  --access-token "$FLY_ACCESS_TOKEN_ECHO" \
  --config "$CONFIG"

flyctl deploy \
  --access-token "$FLY_ACCESS_TOKEN_ECHO" \
  --config "$CONFIG" \
  --dockerfile services/echo/Dockerfile \
  --build-arg CI="$CI" \
  --build-arg GITHUB_RUN_NUMBER="$GITHUB_RUN_NUMBER" \
  --build-arg DEPLOYMENT_ID="$DEPLOYMENT_ID" \
  --ha=false \
  --remote-only
