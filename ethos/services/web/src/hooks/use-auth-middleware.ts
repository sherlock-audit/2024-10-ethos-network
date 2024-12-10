import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { zeroAddress } from 'viem';
import { useAccount } from 'wagmi';
import { ONBOARDING_SKIP_SESSION_KEY } from 'constant/constants';
import { useAuthModals } from 'contexts/auth-modals.context';
import { useCurrentUser } from 'contexts/current-user.context';
import { useSessionStorage } from 'hooks/use-storage';
import { usePendingInvitationsBySubject } from 'hooks/user/lookup';
import { generateProfileInviteUrl } from 'utils/routing';

export function useAuthMiddleware() {
  const [shouldSkipOnboarding] = useSessionStorage<boolean>(ONBOARDING_SKIP_SESSION_KEY);
  const router = useRouter();
  const { connectedAddress, connectedProfile, status } = useCurrentUser();
  const hasProfile = Boolean(connectedProfile);
  const { chain } = useAccount();
  const { data: pendingInvitations } = usePendingInvitationsBySubject(
    {
      address: connectedAddress ?? zeroAddress,
    },
    shouldSkipOnboarding,
  );

  const { setActiveModal } = useAuthModals();

  const handleAuth = useCallback(
    async (e?: React.MouseEvent<HTMLElement>) => {
      if (!connectedAddress && status !== 'connecting') {
        setActiveModal('connect');
        e?.preventDefault();

        return false;
      } else if (status === 'connected' && !chain) {
        setActiveModal('wrong-network');
        e?.preventDefault();

        return false;
      } else if (!hasProfile) {
        if (pendingInvitations?.length && !shouldSkipOnboarding) {
          router.push(
            await generateProfileInviteUrl(
              pendingInvitations[pendingInvitations.length - 1].id,
              connectedAddress ?? zeroAddress,
              true,
            ),
          );
          e?.preventDefault();

          return false;
        } else {
          setActiveModal('invite');
          e?.preventDefault();

          return false;
        }
      }

      return true;
    },
    [
      connectedAddress,
      hasProfile,
      pendingInvitations,
      router,
      setActiveModal,
      shouldSkipOnboarding,
      status,
      chain,
    ],
  );

  useEffect(() => {
    if (connectedAddress ?? hasProfile) {
      setActiveModal(null);
    }
  }, [connectedAddress, hasProfile, setActiveModal]);

  return { handleAuth };
}
