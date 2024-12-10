import { duration } from '@ethos/helpers';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  coinbaseWallet,
  metaMaskWallet,
  rainbowWallet,
  safeWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { getEnvironment } from 'config/environment';

// TODO: remove this once we support coinbase smart wallets
coinbaseWallet.preference = 'eoaOnly';

// https://wagmi.sh/react/typescript
declare module 'wagmi' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    config: typeof config;
  }
}

const config = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
  // This is used for polling contract events or for checking transaction
  // status. On the FE we only use the client for waiting for transactions to
  // complete. This should speed up the success tx notification.
  // Note, default is 4 seconds.
  pollingInterval: duration(1, 'second').toMilliseconds(),
});

function getProjectId() {
  const env = getEnvironment();

  switch (env) {
    case 'local':
    case 'dev':
      // https://cloud.walletconnect.com/app/720cef09-ab65-45b1-be5d-1f4be2b5ed5c/project/22a08899-6a96-4f38-8b31-38eae528fc58
      return '2788105a86b5f09f8039888c8eff7ce7';
    case 'testnet':
      // https://cloud.walletconnect.com/app/720cef09-ab65-45b1-be5d-1f4be2b5ed5c/project/8f379906-2a83-4e3a-9c6a-872ec1d2ea74
      return 'e22eb7b389459c4fab00c388bf61af37';
    default:
      throw new Error(`Invalid environment: ${env}`);
  }
}

export const rainbowkitConfig = getDefaultConfig({
  appName: 'Ethos',
  projectId: getProjectId(),
  chains: config.chains,
  ssr: true,
  transports: {
    [baseSepolia.id]: http(),
  },
  wallets: [
    {
      groupName: 'Popular',
      wallets: [safeWallet, rainbowWallet, coinbaseWallet, metaMaskWallet, walletConnectWallet],
    },
  ],
});

export function getPrivyAppId() {
  const env = getEnvironment();

  switch (env) {
    case 'local':
    case 'dev':
      return 'cm28tigsl01nrx1wh7ek7gd4w';
    case 'testnet':
      return 'cm33meogs04dfgb0rxfhrbb68';
    default:
      throw new Error(`Invalid environment: ${env}`);
  }
}
