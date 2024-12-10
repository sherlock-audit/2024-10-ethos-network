import { duration } from '@ethos/helpers';
import { type TwitterProfileCache } from '@prisma-pg/client';
import { prisma } from '../../data/db.js';
import { cachedOperation, createLRUCache } from './lru.cache.js';

const CACHE_DURATION = duration(1, 'hour').toMilliseconds();
const twitterUserCache = createLRUCache<TwitterProfileCache | null>(CACHE_DURATION);

async function cachedGet(username: string): Promise<TwitterProfileCache | null> {
  return await cachedOperation('twitterUserCache', twitterUserCache, username, get);
}

async function get(username: string): Promise<TwitterProfileCache | null> {
  const cached = await prisma.twitterProfileCache.findFirst({
    where: {
      username,
    },
    orderBy: {
      // Make sure to get the most recent profile who owns that username. The
      // edge case is userA with username "bike" changes it to something else so
      // userB can use that username. If both users are Ethos users or they've
      // been reviewed, we will have both of them in the database. Because we
      // don't update records often (7 days is considered stale now), we might
      // have both users have the same username. So whoever has the most recent
      // profile is the one we want to return.
      updatedAt: 'desc',
    },
  });

  if (!cached) {
    return null;
  }

  return cached;
}

async function set({
  id,
  username,
  name,
  avatar,
  biography,
  website,
  followersCount,
  joinedAt,
  isBlueVerified,
}: {
  id: string;
  username: string;
  name: string;
  avatar?: string;
  biography?: string;
  website?: string;
  followersCount?: number;
  joinedAt?: Date;
  isBlueVerified: boolean;
}): Promise<TwitterProfileCache> {
  return await prisma.twitterProfileCache.upsert({
    where: { id },
    create: {
      id,
      username,
      name,
      avatar,
      biography,
      website,
      followersCount,
      joinedAt,
      isBlueVerified,
    },
    update: {
      username,
      name,
      avatar,
      biography,
      website,
      followersCount,
      joinedAt,
      isBlueVerified,
    },
  });
}

export const twitterUser = { get: cachedGet, set };
