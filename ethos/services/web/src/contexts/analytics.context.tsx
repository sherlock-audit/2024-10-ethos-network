'use client';

import { type BrowserAnalyticsClient } from '@ethos/analytics';
import * as Sentry from '@sentry/nextjs';
import { createContext, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { initializeAnalytics } from '../services/analytics/browser-amplitude';
import { useCurrentUser } from './current-user.context';
import { useRunOnce } from 'hooks/helpers/useRunOnce';

const AnalyticsContext = createContext(null);

function useInitAnalytics() {
  const { connectedAddress, connectedProfile } = useCurrentUser();
  const profileId = connectedProfile?.id;
  const { connector } = useAccount();
  const [analyticsClient, setAnalyticsClient] = useState<BrowserAnalyticsClient | undefined>();

  useRunOnce(() => {
    setAnalyticsClient(initializeAnalytics());
  });

  // Set custom user properties
  useEffect(() => {
    if (!connectedAddress || !analyticsClient) {
      return;
    }

    analyticsClient.setUserProperties({
      '[User] wallet': connectedAddress,
      ...(connector ? { '[User] connectorId': connector?.id } : {}),
    });
  }, [connectedAddress, connector, connector?.id, analyticsClient]);

  useEffect(() => {
    if (!profileId || !analyticsClient) {
      return;
    }

    analyticsClient.setUserId(`profileId:${profileId}`);
  }, [analyticsClient, profileId]);

  useEffect(() => {
    if (!profileId || !connectedAddress) return;

    // Set user context to Sentry
    Sentry.setUser({ id: profileId, connectedAddress });
  }, [connectedAddress, profileId]);
}

export function AnalyticsProvider({ children }: React.PropsWithChildren) {
  useInitAnalytics();

  return <AnalyticsContext.Provider value={null}>{children}</AnalyticsContext.Provider>;
}
