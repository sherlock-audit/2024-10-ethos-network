# Ethos

This repository is a monorepo. It consists of two main directories:

* `packages` - for reusable libraries
* `services` - for services (for now it's just `web`)

## Development

### Prerequisites

#### Node.js

You need to have Node.js v22 installed. If you use
[nvm](https://github.com/nvm-sh/nvm#installing-and-updating), you can run this
commands in the root:

```shell
# This installs the required Node.js version
nvm install
# Switches to the correct Node.js version (useful only if you have a couple of Node.js versions)
nvm use
```

#### Docker

Install [Docker](https://www.docker.com/products/docker-desktop/) or [OrbStack](https://orbstack.dev/) (if you are on MacOS, it's a more lightweight and more performant alternative to Docker) or [podman](https://podman.io/) (on linux)

### Set environment variables

#### services/echo

Copy `services/echo/.env.sample` file into `services/echo/.env` and fill in some values.

`ALCHEMY_API_KEY` - you can create a new Alchemy account and grab the API key, or copy one shared via 1password (*if you set up a new Alchemy account, make sure to enable the Ethereum Mainnet and Base networks.*) \
`MORALIS_API_KEY` - you can either create a new Moralis account or copy one
shared via 1Password. \
`FIREBASE_ADMIN_CREDENTIALS` - copy the value from 1Password shared under
**Firebase (dev)** name.
`SIGNER_ACCOUNT_PRIVATE_KEY` - copy it from 1Password shared under **Testnet wallets** name. \
`STATSIG_SECRET_KEY` - copy it from 1Password shared under **STATSIG_SECRET_KEY** name. \
`TWITTER_BEARER_TOKEN` - copy **Bearer Token** from 1Password shared under **Twitter Developer API Key** name.

#### services/web

Copy `services/web/.env.sample` file into `services/web/.env` and fill in some values.

### Running the app

Now you can install all dependencies by running:

```shell
npm ci
```

Once it's done, you can run the Ethos web server:

```shell
npm start
```

> 💡 To run monitoring tools along with services, run `npm run start:monitoring`

### NPM scripts

* `npm run build` — build an entire monorepo
* `npm run build:packages` — build all workspaces in `packages` directory
* `npm run cleanup` — delete all generated content, including `node_modules`
* `npm run knip` — find dead code (unused files, dependencies and exports)
* `npm run lint` — validate root `package.json`, run ESLint on TS files, run custom linters (like the Solhint)
* `npm run lint:src` — run ESLint on TS files
* `npm run seed:testnet` — populate testnet contracts with fake data (read the instruction how to use it below)
* `npm start` — run the entire project
* `npm run start:monitoring` - run the entire project including monitoring tools
* `npm run start:echo` — run `echo` service only
* `npm run start:web` — run `web` service only
* `npm test` — run tests in the entire monorepo
* `npm run test:ci` — run tests in the same way they are running in CI
* `npm run test:contracts:view` — open contracts test coverage report in browser
  (make sure to generate the report first. Either by running `npm test` or
  navigate to `packages/contracts` directory and run and running `npx hardhat coverage` there)
* `npm run typecheck` — run type check for the entire monorepo
* `npm run validate` — run all checks to validate the code (it builds the monorepo, run linters, performs type check and run tests)
* `npm run validate:root-package` — validate root `package.json` file to ensure it doesn't have any *prod* dependencies
* `npm run validate:secrets` — check for Ethereum secret keys in our codebase (emergency! do not push!)

## Working with contracts

We use [Hardhat](https://hardhat.org/) which helps us to compile contracts, test
them and deploy.

### Local development

To work with contracts, navigate to `packages/contracts` directory:

```shell
cd packages/contracts
```

These are some useful commands you can run to interact with contracts:

```shell
# Compile the contract
npx hardhat compile

# Run tests
npx hardhat test

# Run tests and generate coverage
npx hardhat coverage
```

### Deploy contracts

> **IMPORTANT: refer to README in `contracts` folder**

Before deploying the contract, first you need to set up your environment. Copy
`packages/contracts/.env.sample` file into `packages/contracts/.env`.

1. Supply values for the admin, owner, and signer addresses. The testnet addresses can be found in the 1Password Vault under **Dev (testnet) wallets**, or you can generate your own keys for testing.
   1. Option 1: [Get your MetaMask wallet private
   key](https://support.metamask.io/hc/en-us/articles/360015289632-How-to-export-an-account-s-private-key)
   from which you will be deploying the contract.
   1. Option 2: Generate them with the [ethereum tools](https://geth.ethereum.org/docs/getting-started/installing-geth):
      1. `ethkey generate`
      1. `ethkey inspect --private keyfile.json`
   1. Option 3: Use the ethos CLI:
      1. `ethos wallet create --nickname signer`

1. Set up Alchemy app:
   1. Sign up for [Alchemy account](https://www.alchemy.com/).
   1. [Create a new app](https://dashboard.alchemy.com/apps) for Base Sepolia network and Mainnet (for ENS) and call it `Ethos (dev)`.
   1. Copy the API Key into `ALCHEMY_TESTNET_API_KEY` in `.env` file.
   1. Copy the API url into `ALCHEMY_TESTNET_API_URL` in `.env` file.
1. Get access to Basescan
   1. Sign up for a free account on Basescan and generate an API key (<https://basescan.org/myapikey>)
   1. Copy the API Key into `BASESCAN_TESTNET_API_KEY`

Now you are ready to deploy the contract.

> ⚠️ Note, you need to have some ETH on your wallet in order to be able to
> deploy to Base Sepolia test network. Google `base sepolia faucet` and use any of
> them or all of the faucets to put some money on your wallet.

```shell
cd packages/contracts
# Run this command and follow prompts
npm run deploy
```

> 💡 Tip: Press `Cmd+Shift+E` on MacOS (or `Ctrl+Shift+E` on Windows) on the
> website to see the list of deployed contracts.

## Operations

### Scale fly.io builder machine

If you are getting OOM (out of memory) during the deployment, you need to add
more memory to it. You can do this by running:

```shell
./scripts/scale-fly-builder.sh <org>
```

More details at
<https://trust-ethos.atlassian.net/wiki/spaces/ethoscore/pages/152207374>
