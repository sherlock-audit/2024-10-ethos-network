#!/usr/bin/env bash
set -e

# Detect if there are any secrets in the codebase
npm run validate:secrets
echo "✅ No secrets detected in the codebase."

# Validate that we can build all packages
npm run build:packages
echo "✅ All packages are built successfully."

# Validate that the code is compliant with the linting rules
npm run lint
echo -e "\n✅ Code is compliant with the linting rules."

# Run typecheck
npm run typecheck
echo "✅ Typecheck passed."

# Run Jest tests
npm run test:ci
echo -e "\n✅ Jest tests passed.\n"

# Run contract tests if there are changes in the contracts directory
BRANCH="main"
DIRECTORY="packages/contracts"

# Ensure the index is up-to-date with the latest changes
git update-index -q --refresh

# Check for changes in the directory compared to the specified branch
CHANGED_FILES=$(git diff-index --name-only $BRANCH -- $DIRECTORY)

if [ -z "$CHANGED_FILES" ]; then
  echo "⏩ No changes in $DIRECTORY. Skipping running contract tests."
else
  echo "🔍 Changes detected in $DIRECTORY. Running contract tests..."

  npm -w packages/contracts run test:contracts
  echo -e "\n✅ Contract tests passed."
fi

echo -e "\n🎉 All checkes passed successfully."
