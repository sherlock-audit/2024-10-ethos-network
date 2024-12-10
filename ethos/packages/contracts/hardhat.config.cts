import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import '@openzeppelin/hardhat-upgrades';
import 'dotenv/config';
import { TASK_COMPILE_SOLIDITY } from 'hardhat/builtin-tasks/task-names';
import { type HardhatUserConfig, subtask } from 'hardhat/config';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import { base, baseSepolia } from 'viem/chains';

// Workaround for ESM support as directed by the hardhat team:
// https://github.com/NomicFoundation/hardhat/issues/3385#issuecomment-1841380253
subtask(TASK_COMPILE_SOLIDITY).setAction(async (_, { config }, runSuper) => {
  const superRes = await runSuper();

  try {
    await writeFile(
      join(config.paths.root, 'typechain-types', 'package.json'),
      '{ "type": "commonjs" }',
    );
  } catch (error) {
    console.error('Error writing package.json: ', error);
  }

  return superRes;
});

// Used only in tests, otherwise it fails because account private key is required
const nullDefaultAccountPrivateKey = '0'.repeat(64);

const baseMainnetScanApiKey = process.env.BASESCAN_MAINNET_API_KEY ?? '';
const baseTestnetScanApiKey = process.env.BASESCAN_TESTNET_API_KEY ?? '';

const ownerMainnetPrivateKey =
  process.env.OWNER_MAINNET_PRIVATE_KEY ?? nullDefaultAccountPrivateKey;
const ownerPublicTestnetPrivateKey =
  process.env.OWNER_PUBLIC_TESTNET_PRIVATE_KEY ?? nullDefaultAccountPrivateKey;
const ownerDevPrivateKey = process.env.OWNER_DEV_PRIVATE_KEY ?? nullDefaultAccountPrivateKey;

const adminMainnetPrivateKey =
  process.env.ADMIN_MAINNET_PRIVATE_KEY ?? nullDefaultAccountPrivateKey;
const adminPublicTestnetPrivateKey =
  process.env.ADMIN_PUBLIC_TESTNET_PRIVATE_KEY ?? nullDefaultAccountPrivateKey;
const adminDevPrivateKey = process.env.ADMIN_DEV_PRIVATE_KEY ?? nullDefaultAccountPrivateKey;

const config: HardhatUserConfig = {
  // Ivan: compiler optimizer runs 1,000,000. Max: 2**32-1. More can’t be verified (not confirmed)
  solidity: {
    compilers: [
      {
        version: '0.8.26',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200,
            details: {
              yulDetails: {
                optimizerSteps: 'u',
              },
            },
          },
        },
      },
    ],
  },
  networks: {
    dev: {
      chainId: baseSepolia.id,
      url:
        (process.env.ALCHEMY_TESTNET_API_URL ?? '') + (process.env.ALCHEMY_TESTNET_API_KEY ?? ''),
      accounts: [ownerDevPrivateKey, adminDevPrivateKey],
      gasPrice: 8000000000,
    },
    testnet: {
      chainId: baseSepolia.id,
      url:
        (process.env.ALCHEMY_TESTNET_API_URL ?? '') + (process.env.ALCHEMY_TESTNET_API_KEY ?? ''),
      accounts: [ownerPublicTestnetPrivateKey, adminPublicTestnetPrivateKey],
      gasPrice: 8000000000,
    },
    prod: {
      chainId: base.id,
      url:
        (process.env.ALCHEMY_MAINNET_API_URL ?? '') + (process.env.ALCHEMY_MAINNET_API_KEY ?? ''),
      accounts: [ownerMainnetPrivateKey, adminMainnetPrivateKey],
    },
  },
  etherscan: {
    apiKey: {
      dev: baseTestnetScanApiKey,
      testnet: baseTestnetScanApiKey,
      prod: baseMainnetScanApiKey,
    },
    customChains: [
      {
        network: 'prod',
        chainId: base.id,
        urls: {
          apiURL: base.blockExplorers.default.apiUrl,
          browserURL: base.blockExplorers.default.url,
        },
      },
      {
        // https://docs.base.org/network-information/
        // https://docs.basescan.org/v/sepolia-basescan
        network: 'dev',
        chainId: baseSepolia.id,
        urls: {
          apiURL: baseSepolia.blockExplorers.default.apiUrl,
          browserURL: baseSepolia.blockExplorers.default.url,
        },
      },
      {
        // https://docs.base.org/network-information/
        // https://docs.basescan.org/v/sepolia-basescan
        network: 'testnet',
        chainId: baseSepolia.id,
        urls: {
          apiURL: baseSepolia.blockExplorers.default.apiUrl,
          browserURL: baseSepolia.blockExplorers.default.url,
        },
      },
    ],
  },
  gasReporter: {
    currency: 'ETH',
    enabled: false,
  },
  sourcify: {
    enabled: false,
  },
};

export default config;
