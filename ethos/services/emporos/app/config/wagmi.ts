import { createConfig } from '@privy-io/wagmi';
import { cookieStorage, createStorage, http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  ssr: true,
  transports: {
    [baseSepolia.id]: http(),
  },
  storage: createStorage({
    storage: cookieStorage,
  }),
});
