import { type ProfileId } from '@ethos/blockchain-manager';
import {
  toUserKey,
  isTargetValid,
  type EthosUserTarget,
  type ActivityInfo,
  reviewActivity,
  vouchActivity,
  type ActivityType,
  attestationActivity,
  type ActivityActor,
} from '@ethos/domain';
import {
  NetError,
  type UnifiedActivityResponse,
  type UnifiedActivityRequest,
} from '@ethos/echo-client';
import { isValidAddress, shortenHash } from '@ethos/helpers';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { cloneDeep } from 'lodash-es';
import { useMemo } from 'react';
import { type SetNonNullable } from 'type-fest';
import { zeroAddress } from 'viem';
import { type InfiniteQueryResult } from '../api/echo.hooks';
import { getBlockieUrl } from './lookup';
import { DEFAULT_PAGE_SIZE } from 'constant/constants';
import { INVALIDATE_ALL } from 'constant/queries/key.generator';
import { cacheKeys } from 'constant/queries/queries.constant';
import { useCurrentUser } from 'contexts/current-user.context';
import { echoApi } from 'services/echo';

/**
 * Get a single Ethos activity, including supporting metadata like votes and replies, by type and id
 *
 * @param activityType - the type of activity; ie, review or vouch
 * @param id - the id of the activity
 * @returns ethos ActivityInfo
 */
export function useActivity<T extends ActivityType>(
  activityType: T,
  id: number | string,
  currentUserProfileId?: ProfileId | null,
) {
  return useQuery({
    queryKey: [...cacheKeys.activities.get(activityType, id), currentUserProfileId],
    queryFn: async () => {
      try {
        return await echoApi.activities.get<T>(activityType, id, currentUserProfileId);
      } catch (error) {
        if (error instanceof NetError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
  });
}

export function useActivities(params: Parameters<typeof echoApi.activities.bulk>[0]) {
  return useQuery({
    queryKey: [...cacheKeys.activities.bulk, params],
    queryFn: async () => {
      return await echoApi.activities.bulk(params);
    },
  });
}

export function placeholderActor(target: EthosUserTarget) {
  const result: SetNonNullable<ActivityActor, 'name'> = {
    userkey: toUserKey(target),
    name: '...',
    username: '',
    description: '',
    score: 0,
    avatar: null,
    primaryAddress: zeroAddress,
    scoreXpMultiplier: 1,
  };

  if ('address' in target && isValidAddress(target.address)) {
    result.primaryAddress = target.address;
    result.name = shortenHash(target.address);
    result.avatar = getBlockieUrl(target.address);
  }

  return result;
}

/**
 * Get all the display information for an Ethos user, including
 * name, avatar, score, description, etc.
 *
 * @param target the user/actor to lookup
 * @returns ActivityActor
 */
function useActivityActor(target: EthosUserTarget) {
  return useQuery({
    queryKey: cacheKeys.activities.actor(target),
    queryFn: async () => {
      if (!isTargetValid(target)) return null;

      return await echoApi.activities.actor(target);
    },
  });
}

/**
 * Get all the display information for an Ethos user, including
 * name, avatar, score, description, etc.
 * Returns the placeholder data when the user is not found or loaded yet.
 *
 * @param target the user/actor to lookup
 * @returns ActivityActor
 */
export function useActor(target: EthosUserTarget) {
  const { data } = useActivityActor(target);
  const placeholder = useMemo(() => placeholderActor(target), [target]);

  if (!data) return placeholder;

  return { ...data, name: data.name ?? placeholder.name };
}

/**
 * Fetches display information for multiple Ethos users in bulk.
 *
 * This hook retrieves information such as name, avatar, score, and description
 * for multiple users/actors simultaneously. It's useful for efficiently loading
 * data for multiple activity cards or user lists.
 *
 * @param targets - An array of EthosUserTarget objects representing the users to look up.
 * @returns A query result containing an array of ActivityActor objects for the specified targets.
 */
export function useActivityActorsBulk(targets: EthosUserTarget[]) {
  return useQuery({
    queryKey: [...cacheKeys.activities.actors, targets],
    queryFn: async () => {
      const validTargets = targets.filter((t) => isTargetValid(t));

      return await echoApi.activities.actorsBulk(validTargets);
    },
  });
}

/**
 * Converts an array of ActivityInfo into lookup parameters for useActivityVotes
 *
 * @param activities - An array of ActivityInfo objects.
 * @returns An object with 'review' and 'vouch' properties, each containing an array of activity IDs.
 */
export function voteLookup(activities: ActivityInfo[]) {
  return {
    review: activities.filter((info) => info.type === reviewActivity).map((info) => info.data.id),
    vouch: activities.filter((info) => info.type === vouchActivity).map((info) => info.data.id),
    attestation: activities
      .filter((info) => info.type === attestationActivity)
      .map((info) => info.data.id),
  };
}

/**
 * Fetches votes for multiple activities across different types (review, discussion, vouch).
 *
 * This hook retrieves the voting information for a set of activities, including the
 * connected user's votes if available.
 *
 * @param activities - An object containing arrays of activity IDs for each activity type.
 *                     The keys should be 'review', 'discussion', and 'vouch', with each
 *                     value being an array of corresponding activity IDs.
 * @returns A query result containing the voting information for the specified activities.
 *          This includes whether the connected user has voted on each activity and the
 *          total vote counts.
 */
export function useActivityVotes(activities: {
  review?: number[];
  discussion?: number[];
  vouch?: number[];
  attestation?: number[];
}) {
  const { connectedProfile } = useCurrentUser();

  const params: Parameters<typeof echoApi.activities.votes>[0] = {
    connectedProfile: connectedProfile?.id,
  };

  if (activities.review) {
    params.review = activities.review;
  }
  if (activities.discussion) {
    params.discussion = activities.discussion;
  }
  if (activities.vouch) {
    params.vouch = activities.vouch;
  }
  if (activities.attestation) {
    params.attestation = activities.attestation;
  }

  return useQuery({
    queryKey: [...cacheKeys.activities.votes, params],
    queryFn: async () => {
      return await echoApi.activities.votes(params);
    },
  });
}

export function useInfiniteUnifiedActivities(params: UnifiedActivityRequest) {
  return useInfiniteQuery({
    queryKey: cacheKeys.activities.recentInfinite(params),
    queryFn: async ({ pageParam }) => {
      return await echoApi.activities.unified({ ...params, pagination: pageParam });
    },
    initialPageParam: {
      offsets: params.pagination?.offsets ?? {},
      limit: params.pagination?.limit ?? 50,
    } satisfies UnifiedActivityRequest['pagination'],
    getNextPageParam: (lastPage) => {
      const offsets = cloneDeep(lastPage.offsets);

      for (const key of Object.keys(lastPage.counts) as ActivityType[]) {
        offsets[key] = (offsets[key] ?? 0) + (lastPage.counts[key] ?? 0);
      }

      return {
        limit: lastPage.limit,
        offsets,
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
      } satisfies InfiniteQueryResult<UnifiedActivityResponse['data']['values'][number]>;
    },
  });
}

export function useInfiniteRecentActivities(
  params: Omit<Parameters<typeof echoApi.activities.unified>[0], 'orderBy'>,
) {
  return useInfiniteUnifiedActivities({
    ...params,
    pagination: { offsets: {}, limit: params.pagination?.limit },
    orderBy: { field: 'timestamp', direction: 'desc' },
  });
}

// same inputs and outputs as useInfiniteRecentActivities, but restricts parameters to only pagination
export function useInfiniteFeed(
  limit: Parameters<typeof echoApi.activities.unified>[0]['pagination']['limit'],
) {
  return useInfiniteUnifiedActivities({
    excludeHistorical: true,
    pagination: {
      limit: limit ?? DEFAULT_PAGE_SIZE,
    },
    orderBy: { field: 'timestamp', direction: 'desc' },
  });
}

/**
 * Retrieve all recent activities (optionally filtered by a single user)
 * Includes the activity (vouch/review/etc) but also
 * supporting metadata like votes and replies
 * Should be everything needed to render the feed page or profile activity component
 *
 * @param target - (optional) the user to filter activities by
 * @param paginationParams - (optional) support pagination
 * @returns array of ActivityInfo
 */
export function useRecentActivities(
  target?: EthosUserTarget,
  limit?: number,
  filter?: Parameters<typeof echoApi.activities.unified>[0]['filter'],
  direction?: 'author' | 'subject',
) {
  const { connectedProfile } = useCurrentUser();
  const profileId = connectedProfile?.id ?? null;

  return useInfiniteRecentActivities({
    target: target ? toUserKey(target) : undefined,
    filter,
    direction,
    currentUserProfileId: profileId,
    pagination: { offsets: {}, limit: limit ?? DEFAULT_PAGE_SIZE },
  });
}

export function useMutualVouchers(viewer: EthosUserTarget, target: EthosUserTarget) {
  return useQuery({
    queryKey: [...cacheKeys.vouch.byIdPair, viewer, target],
    queryFn: async () => {
      if (![viewer, target].every((t) => isTargetValid(t))) {
        return [];
      }

      const viewerUserKey = toUserKey(viewer);
      const targetUserKey = toUserKey(target);

      // Ignore if viewer and target are the same user
      if (viewerUserKey === targetUserKey) {
        return [];
      }

      const params: Parameters<typeof echoApi.vouches.mutualVouchers>[0] = {
        viewerUserKey,
        targetUserKey,
      };

      try {
        return await echoApi.vouches.mutualVouchers(params);
      } catch (err) {
        if (err instanceof NetError && err.status === 404) {
          return [];
        }

        throw err;
      }
    },
  });
}

export function useInvitesAcceptedBy(profileId?: number, limit: number = 10) {
  return useQuery({
    queryKey: [cacheKeys.profile.byProfileId(profileId ?? INVALIDATE_ALL), limit],
    queryFn: async () => {
      if (!profileId) {
        return undefined;
      }

      return await echoApi.activities.invitesAcceptedBy({
        profileId,
        limit,
      });
    },
    enabled: Boolean(profileId),
  });
}
