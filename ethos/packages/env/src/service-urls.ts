import { type EthosEnvironment } from './environment.js';

type UrlMap = Record<EthosEnvironment, string>;

export const echoUrlMap = {
  local: 'http://localhost:8080',
  dev: 'https://api.dev.ethos.network',
  testnet: 'https://api.testnet.ethos.network',
  prod: 'https://api.ethos.network',
} as const satisfies UrlMap;

export const webUrlMap = {
  local: 'http://localhost:8082',
  dev: 'https://dev.ethos.network',
  testnet: 'https://sepolia.ethos.network',
  prod: 'https://app.ethos.network',
} as const satisfies UrlMap;

export const blockExplorerUrlMap = {
  local: 'https://sepolia.basescan.org',
  dev: 'https://sepolia.basescan.org',
  testnet: 'https://sepolia.basescan.org',
  prod: 'https://basescan.org',
} as const satisfies UrlMap;
