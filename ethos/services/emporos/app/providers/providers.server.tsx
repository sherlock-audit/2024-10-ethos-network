import { type createCache, StyleProvider } from '@ant-design/cssinjs';
import { type EthosTheme } from '@ethos/common-ui';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren } from 'react';
import { type State } from 'wagmi';
import { config } from '~/config/config.server.ts';
import { privyConfig } from '~/config/privy.ts';
import { wagmiConfig } from '~/config/wagmi.ts';
import { AntdConfigProvider } from '~/providers/providers.tsx';

const queryClient = new QueryClient();

export function ServerProviders({
  children,
  styleCache,
  theme,
  wagmiInitialState,
}: PropsWithChildren<{
  styleCache: ReturnType<typeof createCache>;
  theme: EthosTheme;
  wagmiInitialState: State | undefined;
}>) {
  return (
    <StyleProvider layer cache={styleCache}>
      <AntdConfigProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <PrivyProvider appId={config.EMPOROS_PRIVY_APP_ID} config={privyConfig}>
            <WagmiProvider config={wagmiConfig} initialState={wagmiInitialState}>
              {children}
            </WagmiProvider>
          </PrivyProvider>
        </QueryClientProvider>
      </AntdConfigProvider>
    </StyleProvider>
  );
}
