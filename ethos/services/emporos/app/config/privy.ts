import { baseDarkTheme } from '@ethos/common-ui';
import { type PrivyClientConfig } from '@privy-io/react-auth';
import { baseSepolia } from 'wagmi/chains';

export const privyConfig: PrivyClientConfig = {
  // Customize Privy's appearance in your app
  appearance: {
    theme: 'dark',
    accentColor: baseDarkTheme.token.colorPrimary,
  },
  supportedChains: [baseSepolia],
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
  },
};
