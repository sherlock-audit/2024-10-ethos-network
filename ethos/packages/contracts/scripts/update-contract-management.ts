/* eslint-disable no-console */
import { type EthosEnvironment } from '@ethos/env';
import { getLogger } from '@ethos/logger';
import hre from 'hardhat';
import { getContractsForEnvironment } from '../src/index.js';

const { ethers } = hre;

const logger = getLogger('update-contract-management');

const environment = process.env.ETHOS_ENVIRONMENT as EthosEnvironment;
const contractLookup = getContractsForEnvironment(environment);

async function main(): Promise<void> {
  const [owner, admin] = await ethers.getSigners();

  const contractAddressManager = await ethers.getContractAt(
    contractLookup.contractAddressManager.name,
    contractLookup.contractAddressManager.address,
    owner,
  );
  const interactionControl = await ethers.getContractAt(
    contractLookup.interactionControl.name,
    contractLookup.interactionControl.address,
    admin,
  );

  const contracts = Object.values(contractLookup).filter(({ alias }) => Boolean(alias));
  // TODO: use proxy address if available
  const addresses = contracts.map(({ address }) => address);
  const aliases = contracts.map(({ alias }) => alias);

  console.log('\n⏳ Updating contact addresses in ContractAddressManager...\n');

  await contractAddressManager
    .updateContractAddressesForNames(addresses, aliases)
    .then((tx) => tx.wait());

  console.log(
    '✅ Updated the following contracts in ContractAddressManager:',
    contracts.map(({ name }) => name),
  );

  console.log('\n⏳ Updating contracts in InteractionControl...\n');
  const controlledContractNames: string[] = await interactionControl.getControlledContractNames();
  const newControlledContractNames = aliases.filter(
    (alias) => !controlledContractNames.includes(alias as string),
  );
  await interactionControl
    .addControlledContractNames(newControlledContractNames)
    .then((tx) => tx.wait());

  console.log(
    '✅ Updated the following contracts in InteractionControl:',
    newControlledContractNames,
  );
}

main().catch((err) => {
  logger.error({ err }, 'Failed to deploy contract');
  process.exit(1);
});
