import { type ProfileId } from '@ethos/blockchain-manager';
import { type UnifiedActivityRequest } from '@ethos/echo-client';
import { notEmpty } from '@ethos/helpers';
import { type SetOptional } from 'type-fest';
import {
  type useVouchesByAuthorInfinite,
  type useInvitationsByAuthorInfinite,
} from '../../hooks/user/lookup';
import { _keyGenerator, INVALIDATE_ALL, type InvalidateAllOption } from './key.generator';
import { type useReplyInfinite, type useReplySummary } from 'hooks/api/echo.hooks';

export const NO_PERSIST_KEY = 'no-persist';
/**
 * This is a central repository of cache keys for useQuery cache
 * (the keys we use to store data in IndexedDB)
 * so that it is easy to invalidate cache correctly using one master list.
 *
 * The way that Tanstack Queries store keys are using an array
 * where you can invalidate subsets of the cache according to how much of the array
 * each item matches. The array forms a path through the cache, like how you'd
 * traverse a file system or tree.
 *
 * So you can invalidate all activities by invalidating ['activities']
 * or all activities by actor by invalidating ['activities', 'actor']
 * or all activities by target by invalidating ['activities', 'target']
 * or specific activities by invalidating ['activities', 'target', 'id']
 * etc.
 *
 * The keyGenerator is just a convenience function to generate these arrays
 * for us. Example:
 *
 * _keyGenerator.byTarget('activities', 'actor')
 * this returns ['activities', 'actor', 'service:x.com:ben']
 */

export const cacheKeys = {
  // constants
  activities: {
    votes: ['activities', 'votes'],
    // TODO make actors and actor reference the same entries in the cache
    actor: _keyGenerator.byTarget('activities', 'actor'),
    actors: ['activities', 'actors'],
    recentInfinite: (
      param: SetOptional<UnifiedActivityRequest, 'pagination'> | InvalidateAllOption,
    ) => {
      const keys = [NO_PERSIST_KEY, 'activities', 'recent', 'infinite'];

      if (param === INVALIDATE_ALL) return keys;

      const { pagination, ...rest } = param as Exclude<typeof param, InvalidateAllOption>;

      return [...keys, rest];
    },
    get: _keyGenerator.byTargetId('activities', 'get'),
    bulk: ['activities'],
  },
  // grouped functions
  address: {
    byTarget: _keyGenerator.byTarget('address'),
  },
  ens: {
    name: (ensName: string) => ['ens', ensName],
  },
  avatar: {
    byTarget: _keyGenerator.byTarget('avatar'),
  },
  contracts: {
    addresses: ['contracts', 'addresses'],
  },
  review: {
    byId: _keyGenerator.byNumber('review', 'byId'),
    byAuthor: _keyGenerator.byTarget('review', 'byAuthor'),
    bySubject: _keyGenerator.byTarget('review', 'bySubject'),
    stats: {
      byTarget: _keyGenerator.byTarget('reviewStats'),
    },
  },
  vouch: {
    byId: _keyGenerator.byNumber('vouch', 'byId'),
    bySubject: _keyGenerator.byTarget('vouch', 'byVouchee'),
    byAuthor: _keyGenerator.byTarget('vouch', 'byVoucher'),
    byAuthorInfinite: ({
      pagination,
      ...params
    }: SetOptional<Parameters<typeof useVouchesByAuthorInfinite>[0], 'pagination'>) =>
      ['authorProfileIds', params].filter(notEmpty),
    history: {
      byAuthor: _keyGenerator.byTarget('vouch', 'history', 'byAuthor'),
    },
    stats: {
      byTarget: _keyGenerator.byTarget('vouchStats'),
      byCredibility: _keyGenerator.byProfileId('vouchStats', 'byCredibility'),
    },
    rewards: {
      byTarget: _keyGenerator.byTarget('vouchRewards'),
    },
    byIdPair: ['vouch', 'byIdPair'],
  },
  profile: {
    addresses: {
      byTarget: _keyGenerator.byTarget('profileAddresses'),
    },
    byAddress: _keyGenerator.byAddress('profile', 'byAddress'),
    byProfileId: _keyGenerator.byProfileId('profile', 'byProfileId'),
    byTarget: _keyGenerator.byTarget('profile'),
    route: _keyGenerator.byTarget('profile', 'route'),
    leaderboard: {
      credibility: (order: 'asc' | 'desc' = 'desc') => ['credibility-leaderboard', order],
      xp: ['xp-leaderboard'],
    },
  },
  attestation: {
    byTarget: _keyGenerator.byTarget('attestation'),
    extendedByTarget: _keyGenerator.byTarget('extendedByTarget'),
  },
  eth: {
    to: _keyGenerator.byString('ethTo'),
  },
  name: {
    byTarget: _keyGenerator.byTarget('name'),
  },
  description: {
    byTarget: _keyGenerator.byTarget('description'),
  },
  score: {
    elements: _keyGenerator.byTarget('score', 'elements'),
    byTarget: _keyGenerator.byTarget('score'),
    history: _keyGenerator.byTarget('score', 'history'),
    historyDetails: _keyGenerator.byTarget('score', 'historyDetails'),
    byIdPair: ['simulate', 'byIdPair'],
    simulation: (...args: any[]) => ['score', 'simulation', ...args],
    highestScores: (...args: any[]) => ['score', 'actors', 'highest-scores', ...args],
  },
  invitation: {
    byTarget: _keyGenerator.byTarget('invite'),
    byAuthor: _keyGenerator.byTarget('invite', 'byAuthor'),
    byAuthorInfinite: ({
      pagination,
      ...params
    }: SetOptional<Parameters<typeof useInvitationsByAuthorInfinite>[0], 'pagination'>) =>
      ['invitedBy', params].filter(notEmpty),
    bySubject: _keyGenerator.byTarget('invite', 'bySubject'),
  },
  transactions: {
    interactions: (...args: any[]) => ['transactions', 'interactions', ...args],
  },
  reply: {
    query: ({
      pagination,
      ...params
    }: SetOptional<Parameters<typeof useReplyInfinite>[0], 'pagination'>) =>
      ['reply', 'query', params].filter(notEmpty),
    summary: (params: Parameters<typeof useReplySummary>[0]) =>
      ['reply', 'summary', params].filter(notEmpty),
  },
  twitter: {
    user: {
      byIdOrUsername: _keyGenerator.byString('twitter', 'user'),
      byTarget: _keyGenerator.byTarget('twitter', 'user'),
    },
    searchUser: {
      bySearchString: (searchString: string) => ['twitter', 'search', 'user', searchString],
    },
  },
  onboarding: {
    status: (profileId: number | undefined, targetScore: number) =>
      _keyGenerator.byProfileId(
        'onboarding',
        'status',
        String(targetScore),
      )(profileId ?? INVALIDATE_ALL),
  },
  events: {
    process: (...args: any[]) => ['events', 'process', ...args],
  },
  fees: {
    info: ['info'],
  },
  contribution: {
    query: (profileId: ProfileId | undefined, status: string[]) => [
      'contribution-query',
      profileId,
      status,
    ],
    stats: (profileId: ProfileId | undefined, contributionId?: number | undefined) => [
      'contribution-stats',
      profileId,
      contributionId,
    ],
    action: (contributionId: number) => ['contribution-action', contributionId],
  },
  xp: {
    history: (userkey: string, limit: number, offset: number) => [
      'xp',
      'history',
      userkey,
      limit,
      offset,
    ],
  },
};
