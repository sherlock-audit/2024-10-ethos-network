/* eslint-disable no-console */
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ETHOS_ENVIRONMENTS, type EthosEnvironment } from '@ethos/env';
import * as dotenv from 'dotenv';
import inquirer from 'inquirer';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { type HardhatDefinedNetwork } from './scripts/utils.js';
import {
  contracts,
  type Contract,
  getNetworkByEnvironment,
  ETHOS_ENVIRONMENT_NETWORKS,
} from './src/index.js';

dotenv.config();

// If you need to deploy contracts from scratch, you need to take into account
// these dependencies
function dependencyGraph(): void {
  const graph = `
Ethos Contract Dependencies

No Dependencies/
  Contract Address Manager/
    ├── Interaction Control
    └── Signature Verifier/
        ├── Ethos Attestation
        ├── Ethos Discussion
        ├── Ethos Profile
        ├── Ethos Review
        ├── Ethos Vote
        └── Ethos Vouch
`;

  console.log(graph);
}

type RequiredArgs = {
  action: DeploymentScriptAction;
  contract: Contract;
  environment: EthosEnvironment;
};

export type DeploymentScriptAction =
  | 'deployProxy'
  | 'verify'
  | 'deployImplementation'
  | 'updateAddresses';
const actions: Record<DeploymentScriptAction, string> = {
  deployProxy: 'Deploy Proxy Contract (and implementation)',
  deployImplementation:
    '⚠️  Upgrade Implementation Contract (using existing proxy) -- can break current deployments',
  verify: 'Verify Contract on Basescan',
  updateAddresses: '⚠️  Update All Managed Addresses -- can break current deployments',
} as const;

// allows us to call from CLI passing in arguments vs interactive mode
async function parseArguments(): Promise<RequiredArgs | null> {
  function isValidAction(action: unknown): action is DeploymentScriptAction {
    return typeof action === 'string' && Object.keys(actions).some((a) => a === action);
  }

  function isValidContract(contract: unknown): contract is Contract {
    return typeof contract === 'string' && Object.values(contracts).some((c) => c === contract);
  }

  function isValidEnvironment(environment: unknown): environment is EthosEnvironment {
    return typeof environment === 'string' && ETHOS_ENVIRONMENTS.some((e) => e === environment);
  }

  function isRequiredArgs(args: Partial<RequiredArgs>): args is RequiredArgs {
    return Boolean(args.contract && args.action && args.environment);
  }

  const argv = await yargs(hideBin(process.argv))
    .option('contract', {
      type: 'string',
      choices: Object.values(contracts),
      description: 'Contract to deploy/verify/update',
    })
    .option('action', {
      type: 'string',
      choices: Object.keys(actions),
      description: 'Action to perform',
    })
    .option('environment', {
      type: 'string',
      choices: ETHOS_ENVIRONMENTS,
      description: 'Environment to deploy to',
    })
    .parse();

  const args: Partial<RequiredArgs> = {};

  if (isValidContract(argv.contract)) {
    args.contract = argv.contract;
  }

  if (isValidAction(argv.action)) {
    args.action = argv.action;
  }

  if (isValidEnvironment(argv.environment)) {
    args.environment = argv.environment;
  }

  if (isRequiredArgs(args)) {
    return args;
  }

  return null;
}

async function promptForDeploymentOptions(): Promise<RequiredArgs> {
  const actionChoices = Object.entries(actions).map(([key, value]) => ({
    name: value,
    value: key,
  }));

  const input = await inquirer.prompt<RequiredArgs>([
    {
      type: 'list',
      name: 'contract',
      message: 'Select a contract',
      choices: Object.values(contracts),
      pageSize: 20,
    },
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: actionChoices,
    },
    {
      type: 'list',
      name: 'environment',
      message: 'Select an environment',
      choices: Object.entries(ETHOS_ENVIRONMENT_NETWORKS)
        .filter(([env]) => env !== 'local')
        .map(([env, network]) => ({
          name: `${env} (${network})`,
          value: env,
        })),
      default: 'dev',
    },
  ]);

  return input;
}

async function main(): Promise<void> {
  let args: RequiredArgs | null = await parseArguments();
  let usedCli = false;

  checkJqInstalled();
  dependencyGraph();

  if (!args) {
    args = await promptForDeploymentOptions();
  } else {
    usedCli = true;
  }
  console.log(); // Add a newline

  let requiredEnvVars: string[];

  const network = getHardhatNetworkByEnvironment(args.environment);
  switch (network) {
    case 'dev':
      requiredEnvVars = [
        'ALCHEMY_TESTNET_API_KEY',
        'OWNER_DEV_PRIVATE_KEY',
        'BASESCAN_TESTNET_API_KEY',
      ];
      break;
    case 'testnet':
      requiredEnvVars = [
        'ALCHEMY_TESTNET_API_KEY',
        'OWNER_PUBLIC_TESTNET_PRIVATE_KEY',
        'BASESCAN_TESTNET_API_KEY',
      ];
      break;
    case 'prod':
      requiredEnvVars = [
        'ALCHEMY_MAINNET_API_URL',
        'OWNER_MAINNET_PRIVATE_KEY',
        'BASESCAN_MAINNET_API_KEY',
      ];
      console.error('We do not yet support deploying to prod/mainnet');
      process.exit(1);
      break;
    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      console.error(`⚠️  Unsupported environment: ${args.environment}`);
      process.exit(1);
  }
  checkEnvVariables(requiredEnvVars);

  if (args.action === 'verify') {
    console.log(`☑️ Verify mode; will only verify an existing deployment`);
    await verify(args.contract, args.environment);
  } else if (args.action === 'deployProxy' || args.action === 'deployImplementation') {
    await deploy(args.contract, args.environment, args.action);
    await verify(args.contract, args.environment);
  } else if (args.action === 'updateAddresses') {
    await updateAddressManager(args.contract, args.environment);

    // don't offer to update address management if we just did
    return;
  }
  // we used CLI arguments, so don't prompt for further actions
  if (usedCli) return;

  const updateManagement = await offerToUpdateManagement();

  if (updateManagement) await updateAddressManager(args.contract, args.environment);
}

async function verify(contract: Contract, environment: EthosEnvironment): Promise<void> {
  const network = getHardhatNetworkByEnvironment(environment);
  console.log(`🔍 Verifying the contract ${contract} in ${environment} (${network})`);

  const { address, proxyAddress } = getContractAddress(contract, environment);
  const { args, proxyArgs } = getContractArgs(contract, environment);

  try {
    // Verify the proxy contract if it exists
    if (proxyAddress) {
      execSync(
        `hardhat verify --contract @openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy --network ${network} ${proxyAddress} ${proxyArgs.join(' ')}`,
        {
          stdio: 'inherit',
        },
      );
      console.log(`✅ Proxy contract ${contract} verified successfully on ${network}`);
    }

    execSync(`hardhat verify --network ${network} ${address} ${args.join(' ')}`, {
      stdio: 'inherit',
    });
    console.log(
      `✅ ${proxyAddress ? 'Implementation contract' : 'Contract'} ${contract} verified successfully on ${network}`,
    );
  } catch (error) {
    console.error(`❌ Failed to verify contract ${contract} on ${network}:`);
    console.error(error);
    process.exit(1);
  }
}

function getHardhatNetworkByEnvironment(environment: EthosEnvironment): HardhatDefinedNetwork {
  switch (environment) {
    case 'local':
    case 'dev':
      return 'dev';
    default:
      return environment;
  }
}

async function deploy(
  contract: Contract,
  environment: EthosEnvironment,
  action: DeploymentScriptAction,
): Promise<void> {
  const network = getHardhatNetworkByEnvironment(environment);
  console.log(`📜 Deploying the contract: ${contract}`);
  console.log(`⏳ Deploying the contract to ${network}`);

  try {
    execSync(
      `NODE_OPTIONS='--no-warnings=ExperimentalWarning --experimental-loader ts-node/esm/transpile-only' hardhat run scripts/deploy-contract.ts --network ${network}`,
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          ETHOS_ENVIRONMENT: environment,
          HARDHAT_DEPLOY_CONTRACT: contract,
          HARDHAT_DEPLOY_ACTION: action,
        },
      },
    );
    console.log('💤 Waiting for transaction to finish ...');
    await new Promise((resolve) => setTimeout(resolve, 15000)); // Wait for 15 seconds
    console.log(`✅ Contract ${contract} deployed successfully on ${network}`);
  } catch (error) {
    // 77 is the exit code for permission denied
    if ((error as { status?: number }).status === 77) {
      process.exit(0);
    }
    console.error(`❌ Failed to deploy contract ${contract} on ${network}:`);
    console.error(error);
    process.exit(1);
  }
}

function getContractAddress(
  contract: Contract,
  environment: EthosEnvironment,
): { address: string; proxyAddress: string } {
  const contractPath = path.join(
    fileURLToPath(new URL('.', import.meta.url)),
    'src',
    `${contract}.json`,
  );

  if (!fs.existsSync(contractPath)) {
    throw new Error(`Contract file not found: ${contractPath}`);
  }

  const contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

  if (!contractData) {
    throw new Error(`❌  Contract data not found for ${contract} in env ${environment}`);
  }

  const { address, proxyAddress } = contractData[environment];

  if (!address) {
    throw new Error(`❌  Address not found for ${contract} in env ${environment}`);
  }

  return { address, proxyAddress };
}

function getContractArgs(
  contract: Contract,
  environment: EthosEnvironment,
): { args: string[]; proxyArgs: string[] } {
  const contractPath = path.join(
    fileURLToPath(new URL('.', import.meta.url)),
    'src',
    `${contract}.json`,
  );
  const contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

  const isProxyContract = Boolean(contractData[environment].proxyAddress);

  const args = isProxyContract ? [] : contractData[environment].args;

  return { args, proxyArgs: isProxyContract ? contractData[environment].proxyArgs : [] };
}

async function offerToUpdateManagement(): Promise<boolean> {
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
    type: 'confirm',
    name: 'confirm',
    message:
      '\n\n🎛️  Would you like to update contract address management? \n' +
      '⚠️  WARNING ⚠️: This will break Ethos if any contracts are not fully deployed via a proxy and verified. \n' +
      'Only do this once all contracts are deployed and verified.',
    default: false,
  });

  if (!confirm) {
    console.log('⏭️  Skipping contract address management update.');

    return false;
  }

  return true;
}

async function updateAddressManager(
  contract: Contract,
  environment: EthosEnvironment,
): Promise<void> {
  const network = getHardhatNetworkByEnvironment(environment);
  const baseNetwork = getNetworkByEnvironment(environment);
  console.log(
    `\n🎛️  Updating contract address management for ${contract} in ${environment} (${baseNetwork})...`,
  );

  try {
    execSync(
      `NODE_OPTIONS='--no-warnings=ExperimentalWarning --experimental-loader ts-node/esm/transpile-only' hardhat run scripts/update-contract-management.ts --network ${network}`,
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          ETHOS_ENVIRONMENT: environment,
        },
      },
    );
    console.log('🎛️ Contract address management updated successfully.');
  } catch (error) {
    console.error('🚨 Failed to update contract address management:');
    console.error(error);
    process.exit(1);
  }
}

// helper functions

function checkJqInstalled(): void {
  try {
    execSync('jq --version', { stdio: 'ignore' });
  } catch (error) {
    console.error('⚠️  jq is not installed. Please install jq to continue.');
    process.exit(1);
  }
}

function checkEnvVariables(requiredVars: string[]): void {
  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      console.error(`⚠️  Required environment variable ${varName} is not set.`);
      process.exit(1);
    }
  });
}

// make it go
void main();
