import { useFeatureGate } from '@statsig/react-bindings';
import Link from 'next/link';
import { useMemo } from 'react';
import { isDevPageEnabled } from 'app/(root)/dev/_components/dev-page.utils';
import { featureGates } from 'constant/feature-flags';
import { useCurrentUser } from 'contexts/current-user.context';

export function useHeaderNavigationItems() {
  const { value: isAdminPageEnabled } = useFeatureGate(featureGates.isAdminPageEnabled);

  const isDevLinkEnabled = isDevPageEnabled();
  const { connectedProfile } = useCurrentUser();
  const availableInvites = connectedProfile?.invitesAvailable ?? 0;

  const navigationItems = useMemo(
    () => [
      {
        label: <Link href="/">Home</Link>,
        key: 'home',
      },

      {
        key: 'leaderboard',
        label: <Link href="/leaderboard">Leaderboard</Link>,
      },
      connectedProfile
        ? {
            key: 'invite',
            label: <Link href="/invite">Invite · {availableInvites}</Link>,
          }
        : null,
      isAdminPageEnabled
        ? {
            key: 'admin',
            label: <Link href="/admin">Admin</Link>,
          }
        : null,
      isDevLinkEnabled
        ? {
            key: 'dev',
            label: <Link href="/dev">Dev</Link>,
          }
        : null,
    ],
    [connectedProfile, availableInvites, isAdminPageEnabled, isDevLinkEnabled],
  );

  return navigationItems;
}
