import { BlockchainManager } from '@ethos/blockchain-manager';
import { getNetworkByEnvironment } from '@ethos/contracts';
import { config } from './config';

const network = getNetworkByEnvironment(config.ETHOS_ENV);
const isMainnet = network === 'base-mainnet';
const alchemyBaseUrl = isMainnet ? config.ALCHEMY_MAINNET_API_URL : config.ALCHEMY_TESTNET_API_URL;
const alchemyConnectionURL = alchemyBaseUrl + config.ALCHEMY_API_KEY;

export const blockchainManager = new BlockchainManager(config.ETHOS_ENV, {
  alchemyConnectionURL,
});

export const blockchainManagerWithPolling = new BlockchainManager(config.ETHOS_ENV, {
  alchemyConnectionURL,
  polling: true,
});
