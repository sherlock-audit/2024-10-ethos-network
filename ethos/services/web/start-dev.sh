#!/usr/bin/env bash

# Set the NEXT_PUBLIC_APP_VERSION environment variable
export LOCAL_DEV_VERSION=local-$(git rev-parse --short HEAD)

if [ "$NEXT_USE_TURBO" == "true" ]; then
  echo "🚀 Using Turbo"
  NEXT_PUBLIC_VERSION=$LOCAL_DEV_VERSION npx next dev -p 8082 --turbo
else
  NEXT_PUBLIC_VERSION=$LOCAL_DEV_VERSION npx next dev -p 8082
fi
