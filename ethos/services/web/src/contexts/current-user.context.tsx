import { type ProfileId } from '@ethos/blockchain-manager';
import { type EthosUserTarget } from '@ethos/domain';
import { isAddressEqualSafe } from '@ethos/helpers';
import { getEmbeddedConnectedWallet, usePrivy, useWallets } from '@privy-io/react-auth';
import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { getAddress, zeroAddress, type Address } from 'viem';
import { useAccount } from 'wagmi';
import { placeholderActor, useActor } from 'hooks/user/activities';
import { useAttestations, useProfile, useProfileAddresses } from 'hooks/user/lookup';

type CurrentUser = {
  /**
   * Active connected wallet address
   */
  connectedAddress: Address | undefined;
  /**
   * Whether the wallet provider is initialized and wallet connected
   */
  isConnected: boolean;
  /**
   * Current wallet connection status
   * - `connecting` — attempting to establish connection.
   * - `reconnecting` — attempting to re-establish connection to one or more connectors.
   * - `connected` — at least one connector is connected.
   * - `disconnected` — no connection to any connector.
   */
  status: ReturnType<typeof useAccount>['status'];
  /**
   * Detected smart wallet address.
   * @note Not necessary connected to the current's user Ethos profile
   */
  smartWalletAddress?: Address;
  /**
   * Whether the current user has a smart wallet connected to the Ethos profile
   */
  isSmartWalletConnected: boolean;
  /**
   * Detected embedded wallet address.
   */
  embeddedWalletAddress?: Address;
  /**
   * Ethos profile of the connected address
   */
  connectedProfile: ReturnType<typeof useProfile>['data'];
  /**
   * Whether the connected profile addresses are loading
   */
  isLoadingConnectedProfileAddresses: boolean;
  /**
   * Addresses connected to the current Ethos profile
   */
  connectedProfileAddresses: Address[];
  /**
   * Primary address of the connected Ethos profile
   */
  connectedProfilePrimaryAddress?: Address;
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
  isSmartWalletConnected: false,
  connectedProfile: undefined,
  isConnectedProfileLoading: false,
  connectedProfileAddresses: [],
  connectedProfilePrimaryAddress: undefined,
  isLoadingConnectedProfileAddresses: false,
  connectedActor: placeholderActor(emptyTarget),
});

export function CurrentUserProvider({ children }: PropsWithChildren) {
  const { address, status } = useAccount();
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const { data: connectedProfile, isPending: isConnectedProfileLoading } = useProfile(
    { address: address ?? zeroAddress },
    false,
  );
  const { data: profileAddresses, isPending: isLoadingConnectedProfileAddresses } =
    useProfileAddresses({ address: address ?? zeroAddress });
  const connectedActor = useActor(
    connectedProfile ? { profileId: connectedProfile.id } : address ? { address } : emptyTarget,
  );

  const connectedProfileAddresses = profileAddresses?.allAddresses ?? [];
  const isConnected = status === 'connected' && Boolean(address);

  const smartWalletAddress = useMemo(
    () => (user?.smartWallet?.address ? getAddress(user.smartWallet.address) : undefined),
    [user?.smartWallet?.address],
  );
  const isSmartWalletConnected = Boolean(
    smartWalletAddress &&
      connectedProfileAddresses.some((a) => isAddressEqualSafe(a, smartWalletAddress)),
  );
  const embeddedWallet = getEmbeddedConnectedWallet(wallets);
  const embeddedWalletAddress = embeddedWallet ? getAddress(embeddedWallet.address) : undefined;

  const currentUser: CurrentUser = {
    connectedAddress: isConnected ? address : undefined,
    isConnected,
    status,
    isSmartWalletConnected,
    smartWalletAddress,
    embeddedWalletAddress,
    connectedProfile,
    isConnectedProfileLoading,
    connectedProfileAddresses,
    connectedProfilePrimaryAddress: profileAddresses?.primaryAddress,
    isLoadingConnectedProfileAddresses,
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

export function useIsConnectedProfile(profileId: ProfileId): boolean {
  const { connectedProfile } = useCurrentUser();

  return connectedProfile?.id === profileId;
}

export function useIsTargetCurrentUser(target: EthosUserTarget): boolean {
  const { connectedAddress, connectedProfileAddresses, connectedProfile } = useCurrentUser();
  const { data } = useAttestations({ profileId: connectedProfile?.id ?? 0 });
  const attestations = data ?? [];

  if (!connectedAddress) return false;

  if (
    'address' in target &&
    (isAddressEqualSafe(target.address, connectedAddress) ||
      connectedProfileAddresses.some((address) => isAddressEqualSafe(target.address, address)))
  ) {
    return true;
  }

  if ('profileId' in target && target.profileId === connectedProfile?.id) return true;

  if (
    'service' in target &&
    attestations.some((a) => target.service === a.service && target.account === a.account)
  ) {
    return true;
  }

  return false;
}
