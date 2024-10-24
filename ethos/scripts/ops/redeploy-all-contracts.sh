#!/usr/bin/env bash

set -e

# Get the absolute path to the contracts directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(cd "$SCRIPT_DIR/../../packages/contracts" && pwd)"

# Function to deploy a contract
deploy_contract() {
    local contract=$1
    echo "🚀 Deploying $contract..."
    npm run deploy --prefix "$CONTRACTS_DIR" -- --action deployProxy --contract "$contract" --environment dev
}

# Deploy contracts in order
echo "📦 Deploying contracts in dependency order..."

# No Dependencies
deploy_contract "contractAddressManager"

# Depends on contractAddressManager
deploy_contract "interactionControl"
deploy_contract "escrow"
deploy_contract "vaultFactory"
deploy_contract "signatureVerifier"

# Depends on signatureVerifier
deploy_contract "attestation"
deploy_contract "discussion"
deploy_contract "profile"
deploy_contract "review"
deploy_contract "vote"
deploy_contract "vouch"
deploy_contract "slashPenalty"
deploy_contract "vaultManager"

echo "✅ All contracts deployed successfully!"

# Update contract address management
echo "🔄 Updating contract address management..."
npm run deploy --prefix "$CONTRACTS_DIR" -- --action updateAddresses --contract contractAddressManager --environment local

echo "🎉 Deployment and address management update complete!"
