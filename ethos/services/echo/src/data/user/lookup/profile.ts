import { type Attestation, type ProfileId } from '@ethos/blockchain-manager';
import {
  deduplicateTargets,
  type EthosUserTarget,
  type LiteProfile,
  type ProfileAddresses,
} from '@ethos/domain';
import { isValidAddress, notEmpty } from '@ethos/helpers';
import { type Address, getAddress, zeroAddress } from 'viem';
import { convert } from '../../conversion.js';
import { prisma } from '../../db.js';
import { getAttestationTarget } from './attestation-target.js';

export const prismaProfileLiteSelectClause = {
  id: true,
  archived: true,
  createdAt: true,
  updatedAt: true,
  invitesSent: false,
  invitesAvailable: true,
  invitedBy: true,
} as const;

/**
 * Retrieves the profile information for a given Ethos user target.
 *
 * @param target - The Ethos user target, which can be an address, a service/account pair, or a profile ID.
 * @returns A Promise that resolves to the Profile object if found, or null otherwise.
 */
async function getProfile(target: EthosUserTarget): Promise<LiteProfile | null> {
  if ('address' in target) {
    if (!isValidAddress(target.address)) return null;

    const profile = await prisma.profile.findFirst({
      select: prismaProfileLiteSelectClause,
      where: {
        ProfileAddress: {
          some: {
            address: target.address,
          },
        },
      },
    });

    return convert.toLiteProfile(profile);
  }

  if ('service' in target) {
    const attestationTarget = await getAttestationTarget(target);

    const attestation = await prisma.attestation.findFirst({
      where: {
        service: attestationTarget.service,
        account: attestationTarget.account,
        archived: false,
      },
    });

    if (!attestation) return null;

    return await getProfile({ profileId: attestation.profileId });
  }

  if ('profileId' in target) {
    if (target.profileId < 0) return null;

    const profile = await prisma.profile.findFirst({
      select: prismaProfileLiteSelectClause,
      where: {
        id: target.profileId,
      },
    });

    return convert.toLiteProfile(profile);
  }

  throw Error('Attempted to get profile for invalid ethos user');
}

async function getProfileIdByAddress(address: Address): Promise<ProfileId | null> {
  const result = await prisma.profileAddress.findUnique({
    select: {
      profileId: true,
    },
    where: {
      address,
    },
  });

  return result?.profileId ?? null;
}

/**
 * Retrieves profile IDs for a given array of EthosUserTargets.
 *
 * This function takes an array of EthosUserTargets and returns a Map where
 * the keys are the original EthosUserTargets and the values are the corresponding
 * ProfileIds (or null if not found).
 *
 * The function handles three types of targets:
 * 1. Targets with profileId
 * 2. Targets with address
 * 3. Targets with service and account (attestations)
 *
 * It deduplicates the targets, performs bulk queries for efficiency, and
 * matches the results back to the original targets.
 *
 * @param {EthosUserTarget[]} targets - An array of EthosUserTargets to look up
 * @returns {Promise<Map<EthosUserTarget, ProfileId | null>>} A Map of original targets to their ProfileIds (or null)
 */

async function getProfileIdsByTargets(
  targets: EthosUserTarget[],
): Promise<Map<EthosUserTarget, ProfileId | null>> {
  const { targets: distinctTargets } = deduplicateTargets(targets);
  const result = new Map<EthosUserTarget, ProfileId | null>(
    targets.map((target) => [target, null]),
  );

  const profilesTargets = distinctTargets.filter((t) => 'profileId' in t);
  const addresses = distinctTargets.filter((t) => 'address' in t).map((t) => t.address);
  const attestations = distinctTargets.filter((t) => 'service' in t);

  const addressQuery = prisma.profileAddress.findMany({
    where: {
      address: {
        in: addresses,
      },
    },
  });
  const attestationQuery = prisma.attestation.findMany({
    select: {
      profileId: true,
      service: true,
      account: true,
    },
    where: {
      OR: attestations,
    },
  });
  const [addressProfiles, attestationProfiles] = await Promise.all([
    addressQuery,
    attestationQuery,
  ]);

  // The additional loops below serve to preserve the order of the input and use the same
  // object references as keys in the returned Map since javascript doesn't perform value
  // comparisons on objects when used as keys.
  addressProfiles.forEach((ap) => {
    const target = targets.find((t) => 'address' in t && t.address === getAddress(ap.address));

    if (target) result.set(target, ap.profileId);
  });
  attestationProfiles.forEach((at) => {
    const target = targets.find(
      (t) => 'service' in t && t.service === at.service && t.account === at.account,
    );

    if (target) result.set(target, at.profileId);
  });
  profilesTargets.forEach((pt) => {
    const target = targets.find((t) => 'profileId' in t && t.profileId === pt.profileId);

    if (target) result.set(target, pt.profileId);
  });

  return result;
}

async function getProfileIdByAttestation(
  service: string,
  account: string,
): Promise<ProfileId | null> {
  const result = await prisma.attestation.findFirst({
    select: {
      profileId: true,
    },
    where: {
      service,
      account,
    },
  });

  return result?.profileId ?? null;
}

async function getProfiles(targets: EthosUserTarget[]): Promise<LiteProfile[]> {
  const profileIds = targets
    .map((target) => ('profileId' in target ? target.profileId : null))
    .filter((v) => typeof v === 'number');
  const addresses = targets
    .map((target) => ('address' in target ? target.address : null))
    .filter(notEmpty);

  if (profileIds.length === 0 && addresses.length === 0) return [];

  const profiles = await prisma.profile.findMany({
    select: prismaProfileLiteSelectClause,
    where: {
      OR: [
        {
          id: {
            in: profileIds,
          },
        },
        {
          ProfileAddress: {
            some: {
              address: {
                in: addresses,
                mode: 'insensitive',
              },
            },
          },
        },
      ],
    },
  });

  return convert.toLiteProfiles(profiles);
}

/**
 * Get a profile's active attestations.
 * @param profileId The profileId of the attested user.
 * @param archived defaults to false because you probably don't want historical attestations that have been disconnected.
 * @returns
 */
async function getAttestations(
  profileId: ProfileId,
  archived: boolean = false,
): Promise<Attestation[]> {
  const attestations = await prisma.attestation.findMany({
    where: {
      profileId,
      archived,
    },
  });

  return convert.toAttestations(attestations);
}

async function getProfileId(target: EthosUserTarget): Promise<number | null> {
  if ('profileId' in target) {
    if (target.profileId < 0) return null;

    return target.profileId;
  }

  const profile = await getProfile(target);

  if (!profile) return null;

  return profile.id;
}

/**
 * Get the profile ID associated with the given EthosUserTarget.
 *
 * @param target - The EthosUserTarget object, which can contain a profileId, address, or service information.
 * @returns A Promise that returns the profileId (if it exists), the primaryAddress, and all addresses (including primary).
 */

async function getAddresses(target: EthosUserTarget): Promise<ProfileAddresses> {
  let profileId: number | null = null;

  if ('profileId' in target) {
    profileId = target.profileId;
  } else if ('address' in target) {
    const result = await prisma.profileAddress.findFirst({
      select: { profileId: true },
      where: {
        address: target.address,
      },
    });
    profileId = result?.profileId ?? null;
  } else if ('service' in target) {
    const result = await prisma.attestation.findFirst({
      select: { profileId: true },
      where: { service: target.service, account: target.account, archived: false },
      orderBy: {
        createdAt: 'desc',
      },
    });
    profileId = result?.profileId ?? null;
  }

  if (!profileId && 'address' in target) {
    return {
      primaryAddress: target.address,
      allAddresses: [target.address],
    };
  }
  if (!profileId) {
    return {
      primaryAddress: zeroAddress,
      allAddresses: [zeroAddress],
    };
  }

  const addresses = await prisma.profileAddress.findMany({
    where: { profileId },
    orderBy: { id: 'asc' },
  });

  const allAddresses = addresses.map((address) => getAddress(address.address));

  return {
    profileId,
    primaryAddress: allAddresses[0],
    allAddresses,
  };
}

async function getPrimaryAddress(target: EthosUserTarget): Promise<Address | null> {
  if ('address' in target) return target.address;
  const profile = await getProfile(target);

  const primaryAddress = await prisma.profileAddress.findFirst({
    where: { profileId: profile?.id },
    orderBy: { id: 'asc' },
  });

  return primaryAddress ? getAddress(primaryAddress.address) : null;
}

export const profile = {
  getProfile,
  getProfiles,
  getProfileId,
  getPrimaryAddress,
  getProfileIdByAttestation,
  getProfileIdByAddress,
  getProfileIdsByTargets,
  getAttestations,
  getAddresses,
};
