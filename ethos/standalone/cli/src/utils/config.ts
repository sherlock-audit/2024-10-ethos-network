import os from 'node:os';
import path from 'node:path';
import { getConfig } from '@ethos/config';
import {
  attestationContractName,
  discussionContractName,
  reviewContractName,
  vouchContractName,
} from '@ethos/contracts';
import { ETHOS_ENVIRONMENTS, type EthosEnvironment } from '@ethos/env';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { z } from 'zod';

// hardcoding this for now - we do not want to accidentally use real money with this script
const BASE_SEPOLIA = 'base-sepolia';
const MAINNET = 'mainnet';

export const ETHOS_ENV_FILE = path.join(os.homedir(), '.ethos', 'ethos.env');
export const ETHOS_ENV = validEthosEnv(process.env.ETHOS_CLI_ENV);
const { ALCHEMY_API_KEY, ALCHEMY_TESTNET_API_URL } = getAlchemyConfig();

export const alchemyConnectionURL = ALCHEMY_TESTNET_API_URL + ALCHEMY_API_KEY;
export const provider = new ethers.AlchemyProvider(BASE_SEPOLIA, ALCHEMY_API_KEY);
// only used for ENS resolution
export const mainnetProvider = new ethers.AlchemyProvider(MAINNET, ALCHEMY_API_KEY);

function validEthosEnv(env: string | undefined): EthosEnvironment {
  if (!env) {
    return 'dev';
  }

  function isEthosEnvironment(value: string): value is EthosEnvironment {
    if (ETHOS_ENVIRONMENTS.includes(value as EthosEnvironment)) {
      return true;
    }
    throw new Error(`Invalid environment: ${env}; options are: ${ETHOS_ENVIRONMENTS.join(', ')}`);
  }

  if (isEthosEnvironment(env)) return env;

  return 'dev';
}

// Check process.env first otherwise use .env file
function getAlchemyConfig(): { ALCHEMY_API_KEY: string; ALCHEMY_TESTNET_API_URL: string } {
  let apiKey = process.env.ALCHEMY_API_KEY;
  let testnetUrl = process.env.ALCHEMY_TESTNET_API_URL;

  if (!apiKey || !testnetUrl) {
    const envSchema = {
      ALCHEMY_API_KEY: z.string(),
      ALCHEMY_TESTNET_API_URL: z.string().url(),
    };
    dotenv.config({ path: ETHOS_ENV_FILE });
    const config = getConfig(envSchema);

    if (!apiKey) {
      apiKey = config.ALCHEMY_API_KEY;
    }
    if (!testnetUrl) {
      testnetUrl = config.ALCHEMY_TESTNET_API_URL;
    }
  }

  return { ALCHEMY_API_KEY: apiKey, ALCHEMY_TESTNET_API_URL: testnetUrl };
}

function getSignerPrivateKey(): string {
  let signerPrivateKey = process.env.SIGNER_ACCOUNT_PRIVATE_KEY;

  if (!signerPrivateKey) {
    const envSchema = {
      SIGNER_ACCOUNT_PRIVATE_KEY: z.string(),
    };
    dotenv.config({ path: ETHOS_ENV_FILE });
    const config = getConfig(envSchema);
    signerPrivateKey = config.SIGNER_ACCOUNT_PRIVATE_KEY;
  }

  if (!signerPrivateKey) {
    throw new Error('SIGNER_ACCOUNT_PRIVATE_KEY is not set');
  }

  return signerPrivateKey;
}

export function getEthosSigner(): ethers.Wallet {
  // this should only be for dev/testnet
  const signerPrivateKey = getSignerPrivateKey();

  return new ethers.Wallet(signerPrivateKey, provider);
}

export const validTargetContracts: readonly string[] = [
  attestationContractName,
  reviewContractName,
  vouchContractName,
  discussionContractName,
];
