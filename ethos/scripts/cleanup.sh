#!/usr/bin/env bash

set -ex

rm -rf .cache
rm -rf test-reports
find . -type d -name "node_modules" -exec rm -rf {} +
find . -type d -name "dist" -exec rm -rf {} +
rm -rf services/web/.next

rm -rf packages/contracts/artifacts
rm -rf packages/contracts/cache
rm -rf packages/contracts/coverage
rm -rf packages/contracts/typechain-types
rm -rf packages/contracts/src/types
rm -f packages/contracts/coverage.json
