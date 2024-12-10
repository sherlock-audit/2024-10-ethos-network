import {
  useLogin,
  usePrivy,
  type Twitter as PrivyTwitterUser,
  useWallets,
  getEmbeddedConnectedWallet,
} from '@privy-io/react-auth';
import { useFetcher, useRevalidator } from '@remix-run/react';
import { useCallback, useEffect, useRef } from 'react';
import { type TwitterProfileData } from '~/routes/auth.privy-login.tsx';

export function useAuthenticate() {
  const { ready, authenticated, login } = usePrivy();
  const { ready: isWalletsReady } = useWallets();
  const isReady = ready && isWalletsReady;

  return { isReady, authenticated, login };
}

function useSaveMarketUser(onComplete?: () => void) {
  const { state, submit } = useFetcher({ key: 'save-user' });
  const submitInvoked = useRef(false);

  const saveMarketUser = useCallback(
    (twitter: PrivyTwitterUser) => {
      submitInvoked.current = true;
      const userData: TwitterProfileData = {
        id: twitter.subject,
        username: twitter.username,
        name: twitter.name,
        profilePictureUrl: twitter.profilePictureUrl,
      };

      submit(userData, {
        method: 'post',
        encType: 'application/json',
        action: '/auth/privy-login',
      });
    },
    [submit],
  );
  useEffect(() => {
    if (state === 'idle' && submitInvoked.current) {
      onComplete?.();
      submitInvoked.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return { state, saveMarketUser };
}

export function useLoginMarketUser() {
  const { logout } = usePrivy();
  const revalidator = useRevalidator();
  const { saveMarketUser } = useSaveMarketUser(revalidator.revalidate);

  const { login } = useLogin({
    onComplete(user, _isNewUser, wasAlreadyAuthenticated) {
      if (wasAlreadyAuthenticated) return;
      if (!user.twitter) {
        logout();
        revalidator.revalidate();

        return;
      }
      saveMarketUser(user.twitter);
    },
  });

  return login;
}

export function useLogoutMarketUser() {
  const { logout } = usePrivy();
  const revalidator = useRevalidator();

  function handleLogout() {
    logout().then(() => {
      revalidator.revalidate();
    });
  }

  return handleLogout;
}

export function useMarketUser() {
  const { ready, user } = usePrivy();

  const { ready: isWalletsReady, wallets } = useWallets();
  const wallet = getEmbeddedConnectedWallet(wallets);

  return { user, wallet, isReady: ready && isWalletsReady };
}
