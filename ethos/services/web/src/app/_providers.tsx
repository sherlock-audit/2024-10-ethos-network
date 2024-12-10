'use client';

import { Global } from '@emotion/react';
import { type EthosTheme } from '@ethos/common-ui';
import { duration, toNumber } from '@ethos/helpers';
import { PrivyProvider } from '@privy-io/react-auth';
import { SmartWalletsProvider } from '@privy-io/react-auth/smart-wallets';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import * as Sentry from '@sentry/nextjs';
import { StatsigClient } from '@statsig/react-bindings';
import {
  defaultShouldDehydrateQuery,
  type Query,
  QueryClient,
  replaceEqualDeep,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { App as AntdApp, ConfigProvider, Spin, type ThemeConfig } from 'antd';
import { type PropsWithChildren } from 'react';
import { IntercomProvider } from 'react-use-intercom';
import { WagmiProvider } from 'wagmi';
import { ModalProviders } from './_modal-providers';
import { CustomAvatar } from 'components/custom-rainbowkit/custom-avatar.component';
import { useCustomRainbowKitTheme } from 'components/custom-rainbowkit/custom-theme.hook';
import { DevModal } from 'components/dev-modal/dev-modal.modal';
import { PageErrorBoundary } from 'components/error/error-boundary';
import { FeatureGateProvider } from 'components/feature-gate/feature-gate-provider';
import { LottieLoader } from 'components/loading-wrapper/lottie-loader.component';
import {
  getAppVersion,
  getStatsigEnvironment,
  INTERCOM_APP_ID,
  STATSIG_CLIENT_API_KEY,
} from 'config/misc';
import { usePrivyConfig, usePrivyCssVarOverride } from 'config/privy';
import { getTheme } from 'config/theme';
import { getPrivyAppId, rainbowkitConfig } from 'config/wallet-connection';
import { dynamicConfigs } from 'constant/feature-flags';
import { NO_PERSIST_KEY } from 'constant/queries/queries.constant';
import { AnalyticsProvider } from 'contexts/analytics.context';
import { AppNotificationsProvider } from 'contexts/app-notifications.context';
import { BlockchainManagerProvider } from 'contexts/blockchain-manager.context';
import { CurrentUserProvider } from 'contexts/current-user.context';
import { ThemeManagerConsumer, ThemeManagerProvider } from 'contexts/theme-manager.context';
import { useVerifyLatestAppVersion } from 'hooks/helpers/checkAppVersion';
import { createIdbPersister } from 'services/idb-store';
import 'styles/global.css';

Spin.setDefaultIndicator(<LottieLoader size={24} />);

const enableCaching = global.window?.localStorage?.getItem('ethos.dev.ENABLE_CACHING') !== 'false';

if (!enableCaching) console.warn('DEV MODE: caching is disabled');

const INSTANT = 0;

function initStatsig() {
  const client = new StatsigClient(
    STATSIG_CLIENT_API_KEY,
    {},
    { environment: { tier: getStatsigEnvironment() } },
  );

  client.initializeAsync();

  return client;
}

const statsigClient = initStatsig();
const reactQueryCacheTimeConfig = statsigClient.getDynamicConfig(dynamicConfigs.reactQueryCache);
const staleTimeInMs = toNumber(reactQueryCacheTimeConfig.value.staleTimeInMs, 5000);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // With SSR, we usually want to set some default staleTime
      // above 0 to avoid refetching immediately on the client
      staleTime: enableCaching ? staleTimeInMs : INSTANT,
      gcTime: enableCaching ? duration(1, 'day').toMilliseconds() : INSTANT, // clear entire local cache after 24 hours
      refetchInterval: false,
      refetchIntervalInBackground: false,
      throwOnError: true,
      structuralSharing(prevData, data) {
        // Temporarily fix for issue when data includes non-serializable data
        // like BigInt. This only throws an error when NODE_ENV is not
        // "production". It was introduced in react-query v5.53.1
        // (https://github.com/TanStack/query/pull/7966)
        return replaceEqualDeep(prevData, data);
      },
    },
  },
});

const persister = createIdbPersister('global-cache');

const themes: Record<EthosTheme, ThemeConfig> = {
  light: getTheme('light'),
  dark: getTheme('dark'),
} as const;

export function Providers({ children, userTheme }: PropsWithChildren<{ userTheme?: string }>) {
  useVerifyLatestAppVersion();

  return (
    <ThemeManagerProvider userTheme={userTheme}>
      <ThemeManagerConsumer>
        {({ theme }) => (
          <IntercomProvider autoBoot appId={INTERCOM_APP_ID}>
            <ConfigProvider theme={themes[theme]}>
              <Sentry.ErrorBoundary fallback={PageErrorBoundary}>
                <PrivyProviderWrapper>
                  <SmartWalletsProvider>
                    <WagmiProvider config={rainbowkitConfig}>
                      <PersistQueryClientProvider
                        client={queryClient}
                        persistOptions={{
                          persister,
                          buster: getAppVersion(),
                          dehydrateOptions: {
                            shouldDehydrateQuery: (query: Query) => {
                              const keys = query.queryKey;

                              // Should we persist this query?
                              if (
                                Array.isArray(keys) &&
                                // If the query keys contain the NO_PERSIST_KEY,
                                // we will skip persisting this query.
                                (keys.includes(NO_PERSIST_KEY) ||
                                  // Avoid persisting connectorClient query
                                  // (useConnectorClient) in IndexedDB because it's
                                  // not serializable.
                                  keys.includes('connectorClient'))
                              ) {
                                return false;
                              }

                              return defaultShouldDehydrateQuery(query);
                            },
                          },
                        }}
                      >
                        <CurrentUserProvider>
                          <FeatureGateProvider client={statsigClient}>
                            <RainbowKitProviderWrapper>
                              <BlockchainManagerProvider>
                                {/* ReactQueryDevtools is only being rendered locally */}
                                <ReactQueryDevtools
                                  initialIsOpen={false}
                                  buttonPosition="bottom-left"
                                />
                                <AppNotificationsProvider>
                                  <AnalyticsProvider>
                                    <AntdApp
                                      notification={{
                                        placement: 'bottomLeft',
                                      }}
                                    >
                                      <ModalProviders>{children}</ModalProviders>
                                    </AntdApp>
                                    <DevModal />
                                  </AnalyticsProvider>
                                </AppNotificationsProvider>
                              </BlockchainManagerProvider>
                            </RainbowKitProviderWrapper>
                          </FeatureGateProvider>
                        </CurrentUserProvider>
                      </PersistQueryClientProvider>
                    </WagmiProvider>
                  </SmartWalletsProvider>
                </PrivyProviderWrapper>
              </Sentry.ErrorBoundary>
            </ConfigProvider>
          </IntercomProvider>
        )}
      </ThemeManagerConsumer>
    </ThemeManagerProvider>
  );
}

function RainbowKitProviderWrapper({ children }: PropsWithChildren) {
  const theme = useCustomRainbowKitTheme();

  return (
    <RainbowKitProvider avatar={CustomAvatar} theme={theme}>
      {children}
    </RainbowKitProvider>
  );
}

function PrivyProviderWrapper({ children }: PropsWithChildren) {
  const config = usePrivyConfig();
  const styles = usePrivyCssVarOverride();

  return (
    <>
      <Global styles={styles} />
      <PrivyProvider appId={getPrivyAppId()} config={config}>
        {children}
      </PrivyProvider>
    </>
  );
}
