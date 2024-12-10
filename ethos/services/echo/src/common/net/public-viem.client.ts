import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { config } from '../config.js';

const transportUrl = `${config.ETHOS_ENV === 'prod' ? config.ALCHEMY_MAINNET_API_URL : config.ALCHEMY_TESTNET_API_URL}${config.ALCHEMY_API_KEY}`;

export const publicViemClient = createPublicClient({
  chain: config.ETHOS_ENV === 'prod' ? base : baseSepolia,
  transport: http(transportUrl),
});
