/* eslint-disable no-console */
import { ETHOS_ENVIRONMENTS, type EthosEnvironment } from '@ethos/env';
import { getLogger } from '@ethos/logger';
import pc from 'picocolors';
import { type Contract, type ContractLookup, getContractsForEnvironment } from '../src/index.js';
import { writeContractABI } from './utils.js';

const logger = getLogger('update-contract-abi');

function isEthosEnvironment(value: string): value is EthosEnvironment {
  return ETHOS_ENVIRONMENTS.includes(value as EthosEnvironment);
}

function isContract(
  contractName: string,
  contractLookup: ContractLookup,
): contractName is Contract {
  return Object.hasOwn(contractLookup, contractName);
}

async function main(): Promise<void> {
  const ethosEnvironmentRaw = process.env.ETHOS_ENVIRONMENT ?? 'dev';
  const [, , contractNameRaw] = process.argv;

  if (!isEthosEnvironment(ethosEnvironmentRaw)) {
    throw new Error(`Invalid ETHOS_ENVIRONMENT: ${ethosEnvironmentRaw}`);
  }

  if (!contractNameRaw) {
    console.error('Usage: npm run update-abi <contract-name>');
    process.exit(1);
  }

  const contractLookup: ContractLookup = getContractsForEnvironment(ethosEnvironmentRaw);

  if (!isContract(contractNameRaw, contractLookup)) {
    console.error('Available contracts:', Object.keys(contractLookup).join(', '));
    process.exit(1);
  }

  const contractName = contractNameRaw;
  const contractConfig = {
    name: contractLookup[contractName].name,
  };

  console.log(`📝 Updating ABI for ${pc.bold(contractConfig.name)}`);

  try {
    await writeContractABI(contractName, contractConfig);
    console.log(`✅ Successfully updated ABI for ${pc.blue(contractConfig.name)}`);
  } catch (error) {
    logger.error({ error }, `Failed to update ABI for ${contractConfig.name}`);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error({ error }, 'Failed to update contract ABI');
  process.exit(1);
});
