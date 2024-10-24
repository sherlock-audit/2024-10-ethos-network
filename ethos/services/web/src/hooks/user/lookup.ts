import { type Attestation, BlockchainManager, type Review } from '@ethos/blockchain-manager';
import {
  type EthosUserTarget,
  type Invitation,
  isUserKeyValid,
  type LiteProfile,
  type ProfileAddresses,
  toUserKey,
  X_SERVICE,
} from '@ethos/domain';
import { isValidAddress, type PaginatedResponse } from '@ethos/helpers';
import { type QueryKey, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { type Address } from 'viem';
// eslint-disable-next-line no-restricted-imports
import { type ScoreSimulationRequest } from '../../../../echo/src/types/api.types';
import { type PaginationParams } from '../../types/pagination';
import { parsePaginationParams } from '../../utils/pagination';
import { useEthosInfiniteQuery } from '../api/echo.hooks';
import { getEnvironment, getWebServerUrl } from 'config';
import { type InvalidateAllOption } from 'constant/queries/key.generator';
import { cacheKeys } from 'constant/queries/queries.constant';
import { useQueryAwaitDataUpdate } from 'hooks/useWaitForQueryDataUpdate';
import { echoApi } from 'services/echo';

const blockchainManager = new BlockchainManager(getEnvironment());

/**
 * TANSTACK QUERIES
 * This provides a way to wrap all of the lookups into a set of equivalent tanstack queries
 */
type CacheKeyInterface = (target: EthosUserTarget | InvalidateAllOption | null) => QueryKey;

/**
 * Creates a custom React Query hook for user-related data fetching.
 *
 * Note: this is not necessarily a convention we need to follow. It predates the echo API
 * service, and was a workaround for providing a convention for looking users up by
 * a single EthosUserTarget identifier.
 *
 * Only use it if is convenient for you. Otherwise feel free to create custom useQuery
 * hooks.
 *
 * @example
 * const useGetProfile = wrap(cacheKeys.profile.byTarget, getProfile);
 */
function wrap<TParams extends any[], TOut>(
  cacheKeyFx: CacheKeyInterface,
  promisedFx: (target: EthosUserTarget, ...params: TParams) => Promise<TOut | null>,
) {
  return function useCustomHook(
    target: EthosUserTarget,
    disabled?: boolean,
    ...params: TParams
  ): UseQueryResult<TOut | null> {
    return useQuery({
      queryKey: [...cacheKeyFx(target), btoa(JSON.stringify(params))],
      queryFn: async () => {
        try {
          if (target === null) return null;

          return await promisedFx(target, ...params);
        } catch (e) {
          console.error(`Error retrieving user info:`, e, `Target: `, target);
        }

        return null;
      },
      enabled: !disabled,
    });
  };
}

// TODO: consolidate all of these into a giant useQuery collection/object/map
// and get rid of `useGet` as a pattern; it's redundant and whoever initially wrote it is bad at typescript
// (pls don't check git blame; --ben)
export const useProfile = wrap(cacheKeys.profile.byTarget, getProfile);
export const usePrimaryAddress = wrap(cacheKeys.address.byTarget, getPrimaryAddress);
export const useProfileAddresses = wrap(cacheKeys.profile.addresses.byTarget, getProfileAddresses);
export const useAttestations = wrap(cacheKeys.attestation.byTarget, getAttestations);
export const useExtendedAttestations = wrap(
  cacheKeys.attestation.extendedByTarget,
  getExtendedAttestations,
);
export const useScore = wrap(cacheKeys.score.byTarget, echoApi.scores.get);
export const useScoreHistory = wrap(
  cacheKeys.score.history,
  async (target) => await echoApi.scores.history(target),
);
export const useVouchesBySubject = wrap(cacheKeys.vouch.bySubject, getVouchesBySubject);
export const useVouchesByAuthor = wrap(cacheKeys.vouch.byAuthor, getVouchesByAuthor);

export function useVouchesByAuthorInfinite(params: Parameters<typeof echoApi.vouches.query>[0]) {
  return useEthosInfiniteQuery(cacheKeys.vouch.byAuthorInfinite, echoApi.vouches.query, params, {
    limit: params.pagination?.limit ?? 10,
    offset: params.pagination?.offset ?? 0,
  });
}

export const useVouchHistoryByAuthor = wrap(
  cacheKeys.vouch.history.byAuthor,
  getVouchHistoryByAuthor,
);
export const useVouchStats = wrap(cacheKeys.vouch.stats.byTarget, getVouchStats);
export const useVouchRewards = wrap(cacheKeys.vouch.rewards.byTarget, getVouchRewards);
export const useReviewsBySubject = wrap(cacheKeys.review.bySubject, getReviewsBySubject);
export const useReviewStats = wrap(cacheKeys.review.stats.byTarget, getReviewStats);
export const useTwitterProfile = wrap(cacheKeys.twitter.user.byTarget, getTwitterProfile);

export const useInvitationsByAuthor = wrap(cacheKeys.invitation.byAuthor, getInvitationsByAuthor);
export const usePendingInvitationsBySubject = wrap(
  cacheKeys.invitation.bySubject,
  getPendingInvitationsBySubject,
);

export function useInvitationsByAuthorInfinite(
  params: Parameters<typeof echoApi.invitations.query>[0],
) {
  const query = useEthosInfiniteQuery(
    cacheKeys.invitation.byAuthorInfinite,
    echoApi.invitations.query,
    params,
    { limit: params.pagination?.limit ?? 10, offset: params.pagination?.offset ?? 0 },
  );

  return useQueryAwaitDataUpdate(query, (data) => data.total, [
    'INVITATION_ADDED',
    'INVITATION_REVOKED',
  ]);
}

/* UNDERLYING LOOKUP FUNCTIONS */

// TODO bw - memoize or cache these so we don't make an external call every time

/**
 * Retrieves the profile information for a given Ethos user target.
 *
 * @param target - The Ethos user target, which can be an address, a service/account pair, or a profile ID.
 * @returns A Promise that resolves to the Profile object if found, or null otherwise.
 *
 * @throws Error if the provided target is invalid.
 */
export async function getProfile(
  target: EthosUserTarget,
  useCache: boolean = true,
): Promise<LiteProfile | null> {
  if ('address' in target) {
    if (!isValidAddress(target.address)) return null;

    return await echoApi.profiles
      .query({
        addresses: [target.address],
        pagination: { limit: 1, offset: 0 },
        useCache,
      })
      .then(pickSingle);
  }

  if ('service' in target) {
    if (target.service === '' || target.account === '') {
      console.warn('Attempting to handle empty attestation for ethos user');

      return null;
    }
    const attestationHash = blockchainManager.ethosAttestation.hash(target.service, target.account);
    const attestation = await echoApi.attestations
      .query({
        attestationHashes: [attestationHash],
        archived: false,
        pagination: { limit: 1, offset: 0 },
      })
      .then(pickSingle);

    if (!attestation) return null;

    return await getProfile({ profileId: attestation.profileId }, useCache);
  }

  if ('profileId' in target) {
    if (target.profileId < 0) return null;

    return await echoApi.profiles
      .query({
        ids: [target.profileId],
        pagination: { limit: 1, offset: 0 },
        useCache,
      })
      .then(pickSingle);
  }

  throw Error('Attempted to get profile for invalid ethos user');
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

export async function getProfileAddresses(target: EthosUserTarget): Promise<ProfileAddresses> {
  const userkey = toUserKey(target);

  return await echoApi.addresses.getByTarget({ userkey });
}

export async function getPrimaryAddress(target: EthosUserTarget): Promise<Address | null> {
  const profileAddresses = await getProfileAddresses(target);

  return profileAddresses.primaryAddress;
}

export async function getAttestations(
  target: EthosUserTarget,
  pagination?: PaginationParams | null,
  includeArchived?: boolean,
): Promise<Attestation[]> {
  const profile = await getProfile(target);

  if (!profile?.id) return [];

  const attestations = await echoApi.attestations
    .query({
      profileIds: [profile.id],
      archived: includeArchived ? undefined : false,
      pagination: parsePaginationParams(pagination),
    })
    .then((x) => x.values);

  return attestations;
}

export type ExtendedAttestation = Awaited<
  ReturnType<typeof echoApi.attestations.queryExtended>
>['values'][number];

export async function getExtendedAttestations(
  target: EthosUserTarget,
  pagination?: PaginationParams | null,
  includeArchived?: boolean,
): Promise<ExtendedAttestation[]> {
  const profile = await getProfile(target);

  if (!profile?.id) return [];

  const attestations = await echoApi.attestations
    .queryExtended({
      profileIds: [profile.id],
      archived: includeArchived ? undefined : false,
      pagination: parsePaginationParams(pagination),
    })
    .then((x) => x.values);

  return attestations;
}

export function getBlockieUrl(address: Address) {
  return new URL(`/avatar/blockie/${address}`, getWebServerUrl()).toString();
}

async function getTwitterProfile(
  target: EthosUserTarget,
): Promise<Awaited<ReturnType<typeof echoApi.twitter.user.get>>> {
  const attestations = await getAttestations(target, {}, false);

  for (const attestation of attestations) {
    if (attestation.service === X_SERVICE) {
      const profile = await echoApi.twitter.user.get({ id: attestation.account });

      if (profile) return profile;
    }
  }

  if ('service' in target && target.service === X_SERVICE) {
    const profile = await echoApi.twitter.user.get({ id: target.account });

    if (profile) return profile;
  }

  return null;
}

type VouchesQueryResponse = Awaited<ReturnType<typeof echoApi.vouches.query>>;

async function getVouchesBySubject(target: EthosUserTarget): Promise<VouchesQueryResponse | null> {
  const profileId = await getProfileId(target);

  if (profileId === null) return null;

  return await echoApi.vouches.query({
    subjectProfileIds: [profileId],
    pagination: { limit: 20, offset: 0 },
  });
}

async function getVouchesByAuthor(
  target: EthosUserTarget,
  pagination?: PaginationParams | null,
): Promise<VouchesQueryResponse | null> {
  const profileId = await getProfileId(target);

  if (profileId === null) return null;

  return await echoApi.vouches.query({
    authorProfileIds: [profileId],
    archived: false,
    pagination: parsePaginationParams(pagination),
  });
}

/**
 * Retrieves the vouch history for a given Ethos user target. This includes archived AND unarchived vouches
 *
 * @param target - The Ethos user target, which can be an address, a service/account pair, or a profile ID.
 * @returns A Promise that resolves to the VouchQueryResponse object if found, or null otherwise.
 *
 * @throws Error if the provided target is invalid.
 */
async function getVouchHistoryByAuthor(
  target: EthosUserTarget,
  pagination?: PaginationParams | null,
): Promise<VouchesQueryResponse | null> {
  const profileId = await getProfileId(target);

  if (profileId === null) return null;

  return await echoApi.vouches.query({
    authorProfileIds: [profileId],
    pagination: parsePaginationParams(pagination),
  });
}

async function getInvitationsByAuthor(
  target: EthosUserTarget,
  pagination?: PaginationParams | null,
): Promise<PaginatedResponse<Invitation> | null> {
  const profileId = await getProfileId(target);

  if (profileId === null) return null;

  return await echoApi.invitations.query({
    invitedBy: profileId,
    pagination: parsePaginationParams(pagination),
  });
}

export type PendingInvitationsResponse = Awaited<ReturnType<typeof echoApi.invitations.pending>>;

async function getPendingInvitationsBySubject(
  target: EthosUserTarget,
): Promise<PendingInvitationsResponse> {
  const address = await getPrimaryAddress(target);

  if (!address || !isValidAddress(address)) return [];

  return await echoApi.invitations.pending({ address });
}

export async function getVouchStats(target: EthosUserTarget) {
  const profileId = await getProfileId(target);

  if (profileId === null) return null;

  const vouchStats = await echoApi.vouches.stats({
    profileIds: [profileId],
  });

  return vouchStats[profileId] ?? null;
}

async function getVouchRewards(target: EthosUserTarget) {
  const profileId = await getProfileId(target);

  if (profileId === null) return null;

  const rewards = await echoApi.vouches.rewards({ profileIds: [profileId] });

  return rewards[profileId] ?? null;
}

async function getReviewsBySubject(
  target: EthosUserTarget,
): Promise<PaginatedResponse<Review> | null> {
  if ('address' in target) {
    return await echoApi.reviews.query({
      subject: [target.address],
      archived: false,
      pagination: { limit: 20, offset: 0 },
    });
  } else if ('service' in target) {
    return await echoApi.reviews.query({
      attestation: [{ service: target.service, account: target.account }],
      archived: false,
      pagination: { limit: 20, offset: 0 },
    });
  } else if ('profileId' in target) {
    const address = await getPrimaryAddress(target);

    if (!address) return null;

    return await echoApi.reviews.query({
      subject: [address],
      archived: false,
      pagination: { limit: 20, offset: 0 },
    });
  } else {
    throw Error('Attempted to get reviews for invalid ethos user');
  }
}

export async function getReviewStats(target: EthosUserTarget) {
  const userKey = toUserKey(target);

  return await echoApi.reviews.stats({ target: userKey }).then((x) => x.total);
}

export function useScoreSimulation(
  subject: EthosUserTarget,
  simulationParams: ScoreSimulationRequest,
) {
  return useQuery({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    queryKey: cacheKeys.score.simulation(subject, ...Object.entries(simulationParams)),
    queryFn: async () => {
      if (!isUserKeyValid(subject) || !isUserKeyValid(subject)) return null;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      if (Object.values(simulationParams).every((x) => x === null || x === '' || x === undefined))
        return null;

      return await echoApi.scores.simulate(subject, simulationParams);
    },
  });
}

export function pickSingle<T>(response: PaginatedResponse<T>): T | null {
  return response.values?.[0] ?? null;
}
