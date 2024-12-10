import { type EthosEnvironment, webUrlMap } from '@ethos/env';

export function getEnvironment(): EthosEnvironment {
  if (
    process.env.NODE_ENV === 'development' ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ) {
    return 'local';
  }

  // This is a static way to get the environment. It's set as a runtime variable
  // but depending from where the function is called, it might not be available.
  if (process.env.NEXT_PUBLIC_ETHOS_ENV) {
    return process.env.NEXT_PUBLIC_ETHOS_ENV as EthosEnvironment;
  }

  if (typeof window !== 'undefined' && window.location.origin === webUrlMap.dev) {
    return 'dev';
  }

  if (typeof window !== 'undefined' && window.location.origin === webUrlMap.testnet) {
    return 'testnet';
  }

  if (typeof window !== 'undefined' && window.location.origin === webUrlMap.prod) {
    return 'prod';
  }

  throw new Error('Unknown environment');
}
