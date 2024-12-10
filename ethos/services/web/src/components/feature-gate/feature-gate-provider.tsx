import { type StatsigClient, StatsigProvider } from '@statsig/react-bindings';
import { useEffect, type PropsWithChildren } from 'react';
import { useCurrentUser } from 'contexts/current-user.context';

export function FeatureGateProvider({
  client,
  children,
}: PropsWithChildren<{ client: StatsigClient }>) {
  const { connectedAddress, connectedProfile, isConnectedProfileLoading } = useCurrentUser();

  useEffect(() => {
    if (isConnectedProfileLoading) {
      return;
    }

    client.updateUserSync({
      userID: connectedProfile ? String(connectedProfile.id) : undefined,
      customIDs: {
        profileId: connectedProfile ? String(connectedProfile.id) : undefined,
        connectedAddress,
      },
      custom: {
        invitedByProfileId: connectedProfile ? connectedProfile.invitedBy : undefined,
        invitesAvailable: connectedProfile ? connectedProfile.invitesAvailable : undefined,
      },
    });
  }, [client, connectedAddress, connectedProfile, isConnectedProfileLoading]);

  return <StatsigProvider client={client}>{children}</StatsigProvider>;
}
