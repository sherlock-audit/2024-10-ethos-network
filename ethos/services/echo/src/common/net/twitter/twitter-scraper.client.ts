import { duration } from '@ethos/helpers';
import { type Profile } from '@the-convocation/twitter-scraper';
import { refreshView } from '../../../data/db';
import { type PrismaTwitterProfileCache } from '../../../data/user/twitter-profile';
import { createLRUCache } from '../../cache/lru.cache';
import { twitterUser } from '../../cache/twitter.cache';
import { rootLogger } from '../../logger';
import { metrics } from '../../metrics';
import { getClientSummaryMetric } from '../client-metrics';
import { ScraperManager } from './scraper-manager.util';
import { TWITTER_PROFILE_NOT_FOUND, TWITTER_PROFILE_SUSPENDED } from './twitter-scraper.errors';

const logger = rootLogger.child({ module: 'twitter-scraper' });
const summary = getClientSummaryMetric('twitter_scraper');
const cacheCount = metrics.makeCounter({
  name: 'twitter_scraper_cache',
  help: 'Counter to measure cache hits and misses',
  labelNames: ['method_name', 'status', 'is_stale'],
});
const nonExistentUsersCount = metrics.makeCounter({
  name: 'twitter_scraper_skip_requesting_non_existing_user',
  help: 'Counter to measure cache hits and misses',
});

const scraper = new ScraperManager();

const STALE_PROFILE_THRESHOLD = duration(7, 'days').toMilliseconds();
const CACHE_DURATION = duration(12, 'hours');
const nonExistentUsersCache = createLRUCache<boolean>(CACHE_DURATION.toMilliseconds());

export class TwitterScraper {
  private readonly scraper: ScraperManager;

  constructor() {
    this.scraper = scraper;
  }

  async getProfile(
    username: string,
    refreshNameView: boolean = true,
  ): Promise<PrismaTwitterProfileCache | null> {
    if (nonExistentUsersCache.has(username)) {
      logger.info({ data: { username } }, 'skip_requesting_non_existing_user');
      nonExistentUsersCount.inc();

      return null;
    }

    return await getProfileAndCacheAside({
      getFromSource: async () => {
        const labels = {
          method_name: 'getProfile',
          http_method: 'GET',
        };
        const startTime = Date.now();

        try {
          const profile = await this.scraper.getProfile(username);

          summary
            .labels({
              ...labels,
              response_code: 200,
            })
            .observe(Date.now() - startTime);

          if (!profile?.userId) {
            throw new Error('Invalid twitter profile');
          }

          return profile;
        } catch (err) {
          if (
            err instanceof Error &&
            (err.message === TWITTER_PROFILE_NOT_FOUND || err.message === TWITTER_PROFILE_SUSPENDED)
          ) {
            nonExistentUsersCache.set(username, Promise.resolve(true));

            summary
              .labels({
                ...labels,
                response_code: 404,
              })
              .observe(Date.now() - startTime);

            logger.info({ data: { username, errorMessage: err.message } }, 'no_profile_found');
          } else {
            summary
              .labels({
                ...labels,
                response_code: 'failed',
              })
              .observe(Date.now() - startTime);

            logger.error({ err, data: { username } }, 'Error getting twitter profile');
          }

          return null;
        }
      },
      async getFromCache() {
        return await twitterUser.get(username);
      },
      async setToCache(profile) {
        if (!profile?.userId) {
          return null;
        }

        const user = await twitterUser.set({
          id: profile.userId,
          username: profile.username ?? '',
          name: profile.name ?? profile.username ?? '',
          avatar: profile.avatar,
          biography: profile.biography,
          website: profile.website,
          followersCount: profile.followersCount,
          joinedAt: profile.joined ? new Date(profile.joined) : undefined,
          isBlueVerified: profile.isBlueVerified ?? false,
        });

        if (refreshNameView) {
          await refreshView('names');
        }

        return user;
      },
      checkIfStale(profile) {
        return Date.now() - profile.updatedAt.getTime() > STALE_PROFILE_THRESHOLD;
      },
    });
  }
}

async function getProfileAndCacheAside({
  getFromSource,
  getFromCache,
  setToCache,
  checkIfStale,
}: {
  getFromSource: () => Promise<Profile | null>;
  getFromCache: () => Promise<PrismaTwitterProfileCache | null>;
  setToCache: (profile: Profile | null) => Promise<PrismaTwitterProfileCache | null>;
  checkIfStale: (profile: PrismaTwitterProfileCache) => boolean;
}): Promise<PrismaTwitterProfileCache | null> {
  const cached = await getFromCache();

  // Return cached version if available
  if (cached) {
    const isStale = checkIfStale(cached);

    // Update the cached profile if it is stale but in a non-blocking way. So
    // the first time the profile is requested and we have it in cache, we
    // return a stale version and update the cache in the background.
    if (isStale) {
      getFromSource()
        .then(async (profile) => {
          if (profile) {
            await setToCache(profile);
          }
        })
        .catch((err) => {
          logger.error(
            { err, data: { username: cached.username } },
            'Failed to refresh twitter profile',
          );
        });
    }

    cacheCount
      .labels({ method_name: 'getProfile', status: 'hit', is_stale: String(isStale) })
      .inc();

    return cached;
  }

  cacheCount.labels({ method_name: 'getProfile', status: 'miss' }).inc();

  const profile = await getFromSource();

  return await setToCache(profile);
}
