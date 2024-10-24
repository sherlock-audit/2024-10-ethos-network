'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { zeroAddress } from 'viem';
import { ONBOARDING_SKIP_SESSION_KEY } from 'constant/constants';
import { useCurrentUser } from 'contexts/current-user.context';
import { useSessionStorage } from 'hooks/use-storage';
import { usePendingInvitationsBySubject } from 'hooks/user/lookup';
import { generateProfileInviteUrl } from 'utils/routing';

export function useCheckPendingInvitations() {
  const [shouldSkipOnboarding, setSkipOnboardingValue] = useSessionStorage<boolean>(
    ONBOARDING_SKIP_SESSION_KEY,
  );
  const router = useRouter();
  const pathname = usePathname();
  const { connectedAddress, connectedProfile } = useCurrentUser();
  const { data: pendingInvitations } = usePendingInvitationsBySubject(
    {
      address: connectedAddress ?? zeroAddress,
    },
    shouldSkipOnboarding,
  );

  useEffect(() => {
    if (
      !connectedProfile &&
      pendingInvitations?.length &&
      connectedAddress &&
      !shouldSkipOnboarding
    ) {
      generateProfileInviteUrl(
        pendingInvitations[pendingInvitations.length - 1].id,
        connectedAddress,
        true,
      ).then((inviteUrl) => {
        router.push(inviteUrl);
      });
    }
  }, [
    connectedProfile,
    pendingInvitations,
    connectedAddress,
    router,
    pathname,
    shouldSkipOnboarding,
  ]);

  useEffect(() => {
    if (connectedProfile) {
      //  If user has a profile, pendingInvitations query should be disabled
      setSkipOnboardingValue(true);
    }
  }, [connectedProfile, setSkipOnboardingValue]);
}
