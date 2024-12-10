export const ETHOS_ENVIRONMENTS = ['local', 'dev', 'testnet', 'prod'] as const;

export type EthosEnvironment = (typeof ETHOS_ENVIRONMENTS)[number];

export function isEnvironment(environment: unknown): environment is EthosEnvironment {
  return typeof environment === 'string' && ETHOS_ENVIRONMENTS.some((e) => e === environment);
}
