import {
  type EthosUserTarget,
  type ActivityActor,
  toUserKey,
  fromUserKey,
  type ActivityInfo,
} from '@ethos/domain';
import { duration } from '@ethos/helpers';
import { Prisma } from '@prisma-pg/client';
import { zeroAddress } from 'viem';
import { z } from 'zod';
import { cachedOperation, createLRUCache } from '../../common/cache/lru.cache.js';
import { prisma } from '../../data/db.js';
import { getLatestScore } from '../../data/score/calculate.js';
import { getScoreXpMultiplier } from '../../data/score/xp.js';
import { user } from '../../data/user/lookup/index.js';
import { validators } from '../service.validator.js';
import { type ActivityQueryOutput } from './query/activity-query.js';

export const sharedFilterSchema = z.object({
  target: validators
    .ethosUserKey()
    .transform((x) => fromUserKey(x))
    .optional(),
  direction: z.enum(['author', 'subject']).optional(),
  excludeHistorical: z.boolean().default(false),
  currentUserProfileId: validators.profileId.nullable().default(null),
  orderBy: z.object({
    field: z.enum(['timestamp', 'votes']),
    direction: z.enum(['asc', 'desc']),
  }),
});

export const perTypeFilterSchema = z
  .object({
    ids: z.number().array().optional(),
  })
  .merge(validators.paginationSchema());

export async function queryCount(sql: Prisma.Sql): Promise<number> {
  type CountResult = Array<{
    count: bigint;
  }>;

  const result = await prisma.$queryRaw<CountResult>(sql);

  return Number(result[0].count);
}

export type ActivityQuery<T, O extends ActivityInfo> = {
  query: (
    input: z.infer<typeof sharedFilterSchema> & z.infer<typeof perTypeFilterSchema>,
  ) => Promise<{ results: ActivityQueryOutput<T>; totalCount: number }>;
  hydrate: (results: ActivityQueryOutput<T>) => Promise<O[]>;
};

export function joinOrEmpty(...params: Parameters<typeof Prisma.join>): Prisma.Sql {
  return params[0].length > 0 ? Prisma.join(...params) : Prisma.empty;
}
// cache actors so that if we look up the same actor multiple times in a short
// period of time, we don't hit the database or external APIs too hard
const FIVE_SECONDS_MILLIS = duration(5, 'seconds').toMilliseconds();
const actorCache = createLRUCache<ActivityActor>(FIVE_SECONDS_MILLIS);

export async function getActor(target: EthosUserTarget): Promise<ActivityActor> {
  return await cachedOperation('actorCache', actorCache, target, _getActor);
}

export async function getActors(targets: EthosUserTarget[]): Promise<ActivityActor[]> {
  return await Promise.all(targets.map(getActor));
}

// TODO: remove in favor of getActors once it supports attestation as target
// or when we migrate to single target profileId
async function _getActor(target: EthosUserTarget): Promise<ActivityActor> {
  const profile = await user.getProfile(target);

  if ('profileId' in target) {
    if (!profile) {
      // placeholder actor
      return {
        userkey: toUserKey(target),
        name: '...',
        username: '',
        description: '',
        score: 0,
        avatar: null,
        primaryAddress: zeroAddress,
        scoreXpMultiplier: 1,
      };
    }
  }

  const [{ name, username, avatar, description }, score] = await Promise.all([
    user.getNameAvatarDescription(target),
    getLatestScore(target).then((data) => data?.score ?? 0),
  ]);
  const primaryAddress = await user.getPrimaryAddress(target);

  return {
    userkey: toUserKey(target),
    avatar,
    name,
    username,
    description,
    score,
    scoreXpMultiplier: getScoreXpMultiplier(score),
    profileId: profile?.id,
    primaryAddress: primaryAddress ?? zeroAddress,
  };
}
