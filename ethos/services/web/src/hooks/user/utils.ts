import { type ProfileId } from '@ethos/blockchain-manager';
import { type EthosUserTarget } from '@ethos/domain';
import { isAddressEqualSafe } from '@ethos/helpers';
import { zeroAddress, type Address } from 'viem';
import { useAccount } from 'wagmi';
import {
  getAttestations,
  getProfileAddresses,
  useAttestations,
  usePrimaryAddress,
  useProfile,
  useProfileAddresses,
} from './lookup';

export function useIsConnectedAddress(address: Address | undefined | null): boolean {
  const currentAddress = useConnectedAddress();

  if (!address) return false;
  if (!currentAddress) return false;

  return isAddressEqualSafe(address, currentAddress);
}

/**
 * @deprecated Switch to useCurrentUser
 */
export function useConnectedAddress(): Address | null {
  const { address, status } = useAccount();

  if (status !== 'connected') return null;

  return address;
}

export function useIsCurrentTargetUser(target: EthosUserTarget): boolean {
  const connectedAddress = useConnectedAddress();
  const primaryAddress = usePrimaryAddress(target).data;

  if (!connectedAddress) return false;
  if ('address' in target && isAddressEqualSafe(target.address, connectedAddress)) return true;
  if (!primaryAddress) return false;
  if (isAddressEqualSafe(primaryAddress, connectedAddress)) return true;

  return false;
}

/**
 * @deprecated Switch to useCurrentUser's connectedProfile
 */
export function useConnectedAddressProfile() {
  const connectedAddress = useConnectedAddress();

  return useProfile({ address: connectedAddress ?? zeroAddress }, false);
}

export function useConnectedProfileAddresses() {
  const connectedAddress = useConnectedAddress();

  return useProfileAddresses({ address: connectedAddress ?? zeroAddress });
}

export function useIsConnectedProfile(profileId: ProfileId): boolean {
  const { data: profile } = useConnectedAddressProfile();

  return profile?.id === profileId;
}

export function useConnectedAddressHasProfile() {
  const { data: profile } = useConnectedAddressProfile();

  return profile && typeof profile.id === 'number';
}

export function useConnectedAddressAttestations() {
  const connectedAddress = useConnectedAddress();

  return useAttestations({ address: connectedAddress ?? zeroAddress });
}

/**
 * Retrieve all user targets associated with a given EthosUserTarget.
 * This is used when you need to identify all other ways of identifying a particular user.
 * For example, if Vitalii is 0x5c3bddf9a5638b4f6c97a0c8864fdd5b101c4786, you might use this hook to find:
 * - his profileId: 47
 * - his attestations: {service: "twitter", account: "vitalii"}
 * - other addresses he uses: 0xb3b1b0313b27121479b6f497fd7b2e6a917b6030
 * All of these can be passed in other EthosUserTarget types
 *
 * @param target - The EthosUserTarget to retrieve information for.
 * @returns An object containing:
 *   - profileId: The ProfileId associated with the target, or null if not found.
 *   - attestations: An array of attestations, each containing a service and account.
 *   - addresses: An array of Addresses associated with the target's profile.
 *   - targets: An array of all EthosUserTargets associated with the target (includes all of the above)
 */
export async function getAllUserTargets(target: EthosUserTarget): Promise<{
  profileId: ProfileId | null;
  attestations: Array<{ service: string; account: string }>;
  addresses: Address[];
  targets: EthosUserTarget[];
}> {
  const [profileAddresses, attestations] = await Promise.all([
    getProfileAddresses(target),
    getAttestations(target).then((result) => result ?? []),
  ]);
  const targets: EthosUserTarget[] = [
    ...attestations.map((attestation) => ({
      service: attestation.service,
      account: attestation.account,
    })),
    ...profileAddresses.allAddresses.map((address) => ({ address })),
  ];

  if (profileAddresses.profileId) targets.push({ profileId: profileAddresses.profileId });

  return {
    profileId: profileAddresses?.profileId ?? null,
    attestations,
    addresses: profileAddresses.allAddresses ?? [],
    targets,
  };
}

/**
 * Expands a list of EthosUserTargets to include all associated user targets.
 * This function is useful when you need to update information (like names, descriptions, scores)
 * for all possible identifiers of a user across different views (by profileId, addresses, etc.).
 *
 * @param targets - An array of EthosUserTargets to expand.
 * @returns A Promise that resolves to an array of all associated EthosUserTargets.
 *          This includes the original targets and all related targets found through getAllUserTargets.
 */
export async function explodeUserTargets(targets: EthosUserTarget[]): Promise<EthosUserTarget[]> {
  const allTargets = await Promise.all(targets.map(getAllUserTargets));

  return allTargets.flatMap((result) => result.targets);
}
