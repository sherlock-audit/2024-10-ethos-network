/* eslint-disable no-console */
import { readFileSync, writeFileSync } from 'node:fs';
import { ETHOS_ENVIRONMENTS, type EthosEnvironment } from '@ethos/env';
import { getLogger } from '@ethos/logger';
import hre from 'hardhat';
import inquirer from 'inquirer';
import { cloneDeep, merge } from 'lodash-es';
import pc from 'picocolors';
import { getAddress, type Address } from 'viem';
import { type DeploymentScriptAction } from '../deploy.js';
import {
  getContractsForEnvironment,
  type Network,
  type Contract,
  type ContractConfig,
  getContractKeyByEnvironment,
} from '../src/index.js';
import {
  getAdminAccount,
  getSignerAccount,
  placeholderContractMetadata,
  placeholderProxyContractMetadata,
  writeContractABI,
} from './utils.js';

const { ethers, network } = hre;

type ContractData = {
  address: Address;
  proxyAddress?: Address;
  /**
   * Either the constructor arguments for regular contracts or arguments passed
   * to implementation's initialize function for upgradable contracts
   */
  args: string[];
  /**
   * Arguments passed to the proxy contract constructor
   */
  proxyArgs?: string[];
};

type Metadata = Record<Exclude<EthosEnvironment, 'local'>, ContractData>;

const logger = getLogger('deploy-contract');

function isEthosEnvironment(value: string): value is EthosEnvironment {
  return ETHOS_ENVIRONMENTS.includes(value as EthosEnvironment);
}

const ethosEnvironmentRaw = process.env.ETHOS_ENVIRONMENT;

if (!ethosEnvironmentRaw || !isEthosEnvironment(ethosEnvironmentRaw)) {
  throw new Error(`Invalid ETHOS_ENVIRONMENT: ${ethosEnvironmentRaw}`);
}
const ethosEnvironment = ethosEnvironmentRaw;
const contractLookup = getContractsForEnvironment(ethosEnvironment);
const adminAccount = getAdminAccount(network.name);
const signerAccount = getSignerAccount(network.name);

const contractsConfigMap: ContractConfig = {
  attestation: {
    name: contractLookup.attestation.name,
    isUpgradeable: contractLookup.attestation.isUpgradeable,
    getArguments: (ownerAccount) => [
      ownerAccount,
      adminAccount,
      signerAccount,
      contractLookup.signatureVerifier.address,
      contractLookup.contractAddressManager.address,
    ],
  },
  contractAddressManager: {
    name: contractLookup.contractAddressManager.name,
    isUpgradeable: contractLookup.contractAddressManager.isUpgradeable,
    getArguments: () => [],
  },
  discussion: {
    name: contractLookup.discussion.name,
    isUpgradeable: contractLookup.discussion.isUpgradeable,
    getArguments: (ownerAccount) => [
      ownerAccount,
      adminAccount,
      signerAccount,
      contractLookup.signatureVerifier.address,
      contractLookup.contractAddressManager.address,
    ],
  },
  interactionControl: {
    name: contractLookup.interactionControl.name,
    isUpgradeable: contractLookup.interactionControl.isUpgradeable,
    getArguments: () => [adminAccount, contractLookup.contractAddressManager.address],
  },
  profile: {
    name: contractLookup.profile.name,
    isUpgradeable: contractLookup.profile.isUpgradeable,
    getArguments: (ownerAccount) => [
      ownerAccount,
      adminAccount,
      signerAccount,
      contractLookup.signatureVerifier.address,
      contractLookup.contractAddressManager.address,
    ],
  },
  reputationMarket: {
    name: contractLookup.reputationMarket.name,
    isUpgradeable: contractLookup.reputationMarket.isUpgradeable,
    getArguments: (ownerAccount) => [
      ownerAccount,
      adminAccount,
      signerAccount,
      contractLookup.signatureVerifier.address,
      contractLookup.contractAddressManager.address,
    ],
  },
  review: {
    name: contractLookup.review.name,
    isUpgradeable: contractLookup.review.isUpgradeable,
    getArguments: (ownerAccount) => [
      ownerAccount,
      adminAccount,
      signerAccount,
      contractLookup.signatureVerifier.address,
      contractLookup.contractAddressManager.address,
    ],
  },
  signatureVerifier: {
    name: contractLookup.signatureVerifier.name,
    isUpgradeable: contractLookup.signatureVerifier.isUpgradeable,
    getArguments: () => [],
  },
  vote: {
    name: contractLookup.vote.name,
    isUpgradeable: contractLookup.vote.isUpgradeable,
    getArguments: (ownerAccount) => [
      ownerAccount,
      adminAccount,
      signerAccount,
      contractLookup.signatureVerifier.address,
      contractLookup.contractAddressManager.address,
    ],
  },
  vouch: {
    name: contractLookup.vouch.name,
    isUpgradeable: contractLookup.vouch.isUpgradeable,
    getArguments: (ownerAccount) => [
      ownerAccount,
      adminAccount,
      signerAccount,
      contractLookup.signatureVerifier.address,
      contractLookup.contractAddressManager.address,
      ownerAccount, // protocol fee address
      '0', // entry protocol fee basis points
      '0', // exit fee basis points
      '0', // entry donation fee basis points
      '0', // entry vouchers pool fee basis points
    ],
  },
};

function isContract(value: string): value is Contract {
  return Object.keys(contractsConfigMap).includes(value);
}

const contractNameRaw = process.env.HARDHAT_DEPLOY_CONTRACT;

if (!contractNameRaw || !isContract(contractNameRaw)) {
  throw new Error(`Invalid HARDHAT_DEPLOY_CONTRACT: ${contractNameRaw}`);
}
const contractName = contractNameRaw;

function isDeploymentScriptAction(value: string | undefined): value is DeploymentScriptAction {
  return value === 'deployProxy' || value === 'deployImplementation';
}

const deployActionRaw = process.env.HARDHAT_DEPLOY_ACTION;
const deployAction: DeploymentScriptAction | undefined = isDeploymentScriptAction(deployActionRaw)
  ? deployActionRaw
  : undefined;

// determine which filepath per contract
const metadataFilePath = `./src/${contractName}.json`;

async function main(): Promise<void> {
  const networkName = network.name as Network;

  const [owner] = await ethers.getSigners();
  const contractConfig = contractsConfigMap[contractName];

  if (!contractConfig) {
    throw new Error(`Unknown contract name: ${contractName}`);
  }

  console.log(
    `🚀 Deploying ${pc.bold(contractConfig.name)} to ${pc.bold(networkName)} using account: ${pc.yellow(owner.address)}`,
  );

  if (!contractConfig?.name || !owner.address || !networkName) {
    throw new Error('Invalid contract name, owner address, or network');
  }

  const args = contractConfig.getArguments(owner.address);
  const existingMetadata = getExistingMetadata(contractConfig.isUpgradeable);

  const contractKey = getContractKeyByEnvironment(ethosEnvironment);

  let proxyAddress: string | undefined = existingMetadata[contractKey].proxyAddress;
  let proxyArgs: string[] | undefined = existingMetadata[contractKey].proxyArgs;

  const shouldRedeployProxy = proxyAddress ? await askWhetherToRedeployProxy(deployAction) : true;

  const contract = await ethers.deployContract(
    contractConfig.name,
    // Upgradable contracts don't have constructors, so we don't pass any arguments
    contractConfig.isUpgradeable ? [] : args,
  );

  await contract.waitForDeployment();

  const address =
    typeof contract.target === 'string' ? contract.target : await contract.getAddress();

  if (contractConfig.isUpgradeable) {
    const contractObj = await ethers.getContractFactory(contractConfig.name);

    if (shouldRedeployProxy) {
      console.log(`${proxyAddress ? '♻️  Redeploying' : '🚢 Deploying'} proxy contract...`);

      const result = await deployUpgradableContract(contractObj, address, args);

      proxyArgs = result.proxyArgs;
      proxyAddress = result.proxyAddress;
    } else {
      if (!proxyAddress) {
        throw new Error('Proxy address is required to upgrade implementation');
      }

      console.log('⬆️ Upgrading proxy contract to use new implementation...');

      const proxy = await ethers.getContractAt(contractConfig.name, proxyAddress);

      const tx = await proxy.upgradeToAndCall(address, '0x');

      await tx.wait();
    }
  }

  await writeContractABI(contractName, contractConfig);

  const newContractMetadata: ContractData = {
    address: getAddress(address),
    args,
  };

  if (proxyAddress) {
    newContractMetadata.proxyAddress = getAddress(proxyAddress);
  }

  if (proxyArgs) {
    newContractMetadata.proxyArgs = proxyArgs;
  }

  const metadata = {
    ...existingMetadata,
    [contractKey]: newContractMetadata,
  };

  // Save the contract metadata to a JSON file
  writeFileSync(metadataFilePath, `${JSON.stringify(metadata, null, 2)}\n`);

  // eslint-disable-next-line no-console
  console.log(`✅ ${pc.blue(contractConfig.name)} deployed to ${pc.yellow(address)}`);
}

main().catch((err) => {
  logger.error({ err }, 'Failed to deploy contract');
  process.exit(1);
});

function getExistingMetadata(isUpgradable: boolean): Metadata {
  const placeholder = isUpgradable ? placeholderProxyContractMetadata : placeholderContractMetadata;

  try {
    const fileContent = readFileSync(metadataFilePath, 'utf8');
    const metadata = JSON.parse(fileContent);

    return merge(cloneDeep(placeholder), metadata);
  } catch {
    return placeholder;
  }
}

async function deployUpgradableContract(
  implementationContract: Awaited<ReturnType<typeof ethers.getContractFactory>>,
  implementationContractAddress: string,
  args: string[],
): Promise<{ proxyAddress: string; proxyArgs: string[] }> {
  const ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy');

  const data = implementationContract.interface.encodeFunctionData('initialize', args);

  const proxyContract = await ERC1967Proxy.deploy(implementationContractAddress, data);

  await proxyContract.waitForDeployment();

  const proxyAddress =
    proxyContract.target === 'string' ? proxyContract.target : await proxyContract.getAddress();

  return {
    proxyAddress,
    proxyArgs: [implementationContractAddress, data],
  };
}

async function askWhetherToRedeployProxy(
  action: DeploymentScriptAction | undefined,
): Promise<boolean> {
  if (action) return action === 'deployProxy';
  const { prompt } = await inquirer.prompt<{ prompt: 'deployProxy' | 'deployImplementation' }>([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        {
          name: 'Redeploy the proxy contract and implementation',
          value: 'deployProxy',
        },
        {
          name: 'Upgrade the implementation contract using the existing proxy contract',
          value: 'deployImplementation',
        },
      ],
      default: 'deployProxy',
    },
  ]);

  return prompt === 'deployProxy';
}
