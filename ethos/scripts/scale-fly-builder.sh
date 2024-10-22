#!/usr/bin/env bash

set -e

# Fly builders might change between deployments. I couldn't find a way to enforce
# fly.io to set 8GB for our builder when a new one is created. This script can
# dynamically determine the builder machine id and add more memory.
# Make sure you are logged in with fly CLI. If not, run "fly auth login".

ORG=$1

if [ -z "$ORG" ]; then
  echo "❌ Missing organization"
  echo "Usage: $0 <organization>"
  exit 1
fi

# Get the builder name
BUILDER_NAME=$(fly apps list -o "$ORG" -j | jq -r '.[] | select(.Status=="deployed") | select(.ID | startswith("fly-builder-")).ID')

if [ -z "$BUILDER_NAME" ]; then
  echo "❌ No builder found"
  exit 1
fi

# Get the machine ID
MACHINE_ID=$(fly machines list -a "$BUILDER_NAME" -j | jq -r '.[0].id')

if [ -z "$MACHINE_ID" ]; then
  echo "❌ No machine found"
  exit 1
fi

# Scale the machine
fly machine update "$MACHINE_ID" -a "$BUILDER_NAME" --vm-memory "8GB"
