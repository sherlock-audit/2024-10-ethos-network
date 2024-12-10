'use client';

import { type ProfileId } from '@ethos/blockchain-manager';
import { toUserKey, type EthosUserTarget } from '@ethos/domain';
import {
  NetError,
  type EventsProcessRequest,
  type ContributionActionRequest,
  type ReplySummaryRequest,
  type SignatureForCreateAttestationRequest,
  type ContributionDailyRequest,
  type ValidReplyParams,
} from '@ethos/echo-client';
import {
  duration,
  isValidAddress,
  type PaginatedQuery,
  type PaginatedResponse,
} from '@ethos/helpers';
import {
  type QueryKey,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import retry from 'async-retry';
import { type Address } from 'viem';
import { cacheKeys } from 'constant/queries/queries.constant';
import { useCurrentUser } from 'contexts/current-user.context';
import { echoApi } from 'services/echo';

export function useGetSignatureForCreateAttestation({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: (error: Error, variables: unknown, context: unknown) => unknown;
} = {}) {
  return useMutation({
    mutationFn: async (params: SignatureForCreateAttestationRequest) => {
      return await echoApi.signatures.createAttestation(params);
    },
    onError,
    onSuccess,
  });
}

export function useScoreElements(target: EthosUserTarget | null) {
  return useQuery({
    queryKey: cacheKeys.score.elements(target),
    queryFn: async () => {
      if (!target) return null;

      const response = await echoApi.scores.elements(target);

      return response?.elements ?? null;
    },
  });
}

export function useEventsProcessSync({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: (error: Error, variables: unknown, context: unknown) => unknown;
} = {}) {
  return useMutation({
    mutationFn: async (params: EventsProcessRequest) => {
      return await echoApi.events.process(params);
    },
    onError,
    onSuccess,
  });
}

export function useEventsProcess(txHash: string) {
  return useQuery({
    queryKey: cacheKeys.events.process(txHash),
    queryFn: async () => {
      if (!txHash) return null;

      return await echoApi.events.process({ txHash });
    },
  });
}

export function useHighestScoringActors(limit: number = 5) {
  return useQuery({
    queryKey: cacheKeys.score.highestScores(limit),
    queryFn: async () => {
      const response = await echoApi.scores.highestScoringActors(limit);

      return response ?? null;
    },
  });
}

export function useReplyInfinite(params: ValidReplyParams) {
  return useEthosInfiniteQuery(
    cacheKeys.reply.query,
    echoApi.replies.query,
    params,
    params.pagination,
  );
}

export type InfiniteQueryResult<T> = {
  values: T[];
  total: number;
  remaining: number;
};

export function useEthosInfiniteQuery<TParam, TResult>(
  queryKeyFn: (params: TParam) => QueryKey,
  queryFn: (params: TParam & { pagination: PaginatedQuery }) => Promise<PaginatedResponse<TResult>>,
  params: TParam,
  initialPage: PaginatedQuery = { limit: 50, offset: 0 },
) {
  return useInfiniteQuery({
    queryKey: queryKeyFn(params),
    queryFn: async ({ pageParam }) => {
      return await queryFn({ ...params, pagination: pageParam });
    },
    initialPageParam: initialPage,
    getNextPageParam: (lastPage, pages) => {
      if (pages.length * lastPage.limit >= lastPage.total) {
        return undefined;
      }

      return {
        limit: lastPage.limit,
        offset: pages.length * lastPage.limit,
      };
    },
    select: (data) => {
      const totalPages = data.pages.length;
      const values = data.pages.flatMap((page) => page.values);
      const total = data.pages[totalPages - 1]?.total ?? 0;
      const remaining = total - values.length;

      return {
        values,
        total,
        remaining,
      } satisfies InfiniteQueryResult<TResult>;
    },
  });
}

export function useReplySummary(params: { targetContract: `0x${string}`; parentId: number }) {
  const { connectedProfile } = useCurrentUser();
  const profileId = connectedProfile?.id ?? null;

  return useQuery({
    queryKey: [...cacheKeys.reply.summary(params), profileId],
    queryFn: async () => {
      const request: ReplySummaryRequest = {
        targetContract: params.targetContract,
        parentIds: [params.parentId],
        currentUserProfileId: profileId,
      };

      return await echoApi.replies.summary(request);
    },
    initialData: {
      [params.targetContract]: { [params.parentId]: { count: 0, participated: false } },
    },
    select: (data) => data[params.targetContract][params.parentId],
  });
}

/**
 * Custom hook to perform a search query.
 *
 * @param query - The search query string.
 * @returns A tanstack query result containing the search results.
 *
 * TODO handle pagination better (likely with infinite scrolling in search)
 */
export function useSearchQuery(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () =>
      await echoApi.search.query({ query, pagination: { limit: 20, offset: 0 } }),
    enabled: Boolean(query),
    placeholderData: {
      values: [],
      total: 0,
      limit: 20,
      offset: 0,
    },
    staleTime: duration(1, 'minute').toMilliseconds(),
  });
}

/**
 * Custom hook to fetch vouches by subject profile ID and author profile ID.
 *
 * @param subjectProfileId - The profile ID of the subject.
 * @param authorProfileId - The profile ID of the author.
 * @returns A tanstack query result containing the vouches.
 */

export function useVouchesBySubjectAndAuthor(
  subjectProfileId: ProfileId | undefined,
  authorProfileId: ProfileId | undefined,
) {
  return useQuery({
    queryKey: [...cacheKeys.vouch.byIdPair, subjectProfileId, authorProfileId],
    queryFn: async () => {
      if (!subjectProfileId || !authorProfileId) return null;
      if (subjectProfileId === authorProfileId) return null;

      return await echoApi.vouches.query({
        subjectProfileIds: [subjectProfileId],
        authorProfileIds: [authorProfileId],
        archived: false,
      });
    },
  });
}

export function useRecentProfiles(limit = 5, archived = false) {
  return useQuery({
    queryKey: ['recent-profiles', limit, archived],
    queryFn: async () =>
      await echoApi.profiles.recent({
        archived,
        pagination: {
          limit,
          offset: 0,
        },
      }),
  });
}

export function useCredibilityLeaderboard(order: 'asc' | 'desc' = 'desc') {
  return useQuery({
    queryKey: cacheKeys.profile.leaderboard.credibility(order),
    queryFn: async () => await echoApi.profiles.credibilityLeaderboard({ order }),
  });
}

export function useXpLeaderboard() {
  return useQuery({
    queryKey: cacheKeys.profile.leaderboard.xp,
    queryFn: async () => await echoApi.profiles.xpLeaderboard(),
  });
}

export function useXpHistory(target: EthosUserTarget, limit = 10, offset = 0) {
  const userkey = toUserKey(target);

  return useQuery({
    queryKey: cacheKeys.xp.history(userkey, limit, offset),
    queryFn: async () => {
      if (!userkey) return null;

      const response = await echoApi.xp.history({
        userkey,
        pagination: {
          limit,
          offset,
        },
      });

      return response;
    },
    enabled: Boolean(userkey),
  });
}

export function useRecentInteractions(address: Address | undefined | null, limit = 5, offset = 0) {
  return useQuery({
    queryKey: cacheKeys.transactions.interactions(address, limit, offset),
    queryFn: async () => {
      if (!isValidAddress(address)) return null;

      return await echoApi.transactions.interactions({
        address,
        pagination: { limit, offset },
      });
    },
  });
}

type TwitterProfileParams = Parameters<typeof echoApi.twitter.user.get>[0];

export function buildTwitterProfileOptions(params: TwitterProfileParams) {
  const key = 'id' in params ? `id:${params.id}` : `username:${params.username}`;

  return queryOptions({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: cacheKeys.twitter.user.byIdOrUsername(key),
    queryFn: async () => {
      // This ensures that we don't send the request if, for example, the
      // username is an empty string.
      const hasValidValue = Object.values(params)
        .map((v) => v.trim())
        .some(Boolean);

      if (!hasValidValue) return null;

      return await echoApi.twitter.user.get(params);
    },
    staleTime: duration(1, 'day').toMilliseconds(),
  });
}

export function useTwitterProfile(params: TwitterProfileParams) {
  return useQuery(buildTwitterProfileOptions(params));
}

export function useTwitterUserSearch(searchString: string) {
  return useQuery({
    queryKey: cacheKeys.twitter.searchUser.bySearchString(searchString),
    queryFn: async () => {
      if (!searchString) return null;

      return await echoApi.twitter.user.search({ search: searchString });
    },
    staleTime: duration(10, 'minutes').toMilliseconds(),
  });
}

export function useEnsDetailsByName(ensName: string) {
  return useQuery({
    queryKey: cacheKeys.ens.name(ensName),
    queryFn: async () => await echoApi.ens.getDetailsByName(ensName),
    enabled: Boolean(ensName),
  });
}

export function useFeesInfo() {
  return useQuery({
    queryKey: cacheKeys.fees.info,
    queryFn: async () => await echoApi.fees.info(),
  });
}

export function useContractAddresses() {
  return useQuery({
    queryKey: cacheKeys.contracts.addresses,
    queryFn: async () => await echoApi.contracts.getAddresses({ targetContracts: 'all' }),
  });
}

export function useContributionByProfile(
  profileId: number | undefined,
  status: Parameters<typeof echoApi.contribution.getByProfile>[0]['status'],
) {
  return useQuery({
    queryKey: cacheKeys.contribution.query(profileId, status),
    queryFn: async () => {
      if (!profileId) return null;

      return await echoApi.contribution.getByProfile({ profileId, status });
    },
    enabled: Boolean(profileId),
  });
}

export function useRecordContributionAction() {
  return useMutation({
    mutationFn: async (params: ContributionActionRequest) => {
      await retry(
        async (bail) => {
          try {
            await echoApi.contribution.recordAction(params);
          } catch (err) {
            if (err instanceof NetError && err.code === 'MISSING_TRANSACTION_HASH') throw err;
            else bail(err);
          }
        },
        { retries: 2, minTimeout: 2000, factor: 3 },
      );
    },
  });
}

export function useContributionStats({
  profileId,
  contributionId,
}: {
  profileId: ProfileId | undefined;
  contributionId?: number;
}) {
  return useQuery({
    queryKey: cacheKeys.contribution.stats(profileId, contributionId),
    queryFn: async () => {
      if (!profileId || profileId < 1) return null;

      return await echoApi.contribution.statsByProfile({ profileId });
    },
  });
}

export function useContributionDaily({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: (error: Error, variables: unknown, context: unknown) => unknown;
} = {}) {
  return useMutation({
    mutationFn: async (params: ContributionDailyRequest) => {
      await echoApi.contribution.daily(params);
    },
    onSuccess,
    onError,
  });
}
