import { createContext, useContext, type PropsWithChildren } from 'react';
import { zeroAddress, type Address } from 'viem';
import { useAccount } from 'wagmi';
import { placeholderActor, useActor } from 'hooks/user/activities';
import { useProfile } from 'hooks/user/lookup';

type CurrentUser = {
  /**
   * Active connected wallet address
   */
  connectedAddress: Address | undefined;
  /**
   * Whether the wallet provider is initialized and wallet connected
   */
  isConnected: boolean;
  status: ReturnType<typeof useAccount>['status'];
  /**
   * Ethos profile of the connected address
   */
  connectedProfile: ReturnType<typeof useProfile>['data'];
  /**
   * Whether the connected profile is loading
   */
  isConnectedProfileLoading: boolean;
  /**
   * Actor of the connected profile. Includes actor name, avatar, description, etc.
   */
  connectedActor: ReturnType<typeof useActor>;
};

const emptyTarget = { profileId: 0 };

const CurrentUserContext = createContext<CurrentUser>({
  connectedAddress: undefined,
  isConnected: false,
  status: 'connecting',
  connectedProfile: undefined,
  isConnectedProfileLoading: false,
  connectedActor: placeholderActor(emptyTarget),
});

export function CurrentUserProvider({ children }: PropsWithChildren) {
  const { address, status } = useAccount();
  const { data: connectedProfile, isPending: isConnectedProfileLoading } = useProfile(
    { address: address ?? zeroAddress },
    false,
  );
  const connectedActor = useActor(
    connectedProfile ? { profileId: connectedProfile.id } : address ? { address } : emptyTarget,
  );

  const isConnected = status === 'connected' && Boolean(address);

  const currentUser: CurrentUser = {
    connectedAddress: isConnected ? address : undefined,
    isConnected,
    status,
    connectedProfile,
    isConnectedProfileLoading,
    connectedActor,
  };

  return <CurrentUserContext.Provider value={currentUser}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);

  if (!context) {
    throw new Error('useCurrentUser must be used within a CurrentUserProvider');
  }

  return context;
}
