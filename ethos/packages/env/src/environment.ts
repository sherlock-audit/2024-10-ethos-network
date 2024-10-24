export const ETHOS_ENVIRONMENTS = ['local', 'dev', 'testnet', 'prod'] as const;

export type EthosEnvironment = (typeof ETHOS_ENVIRONMENTS)[number];
