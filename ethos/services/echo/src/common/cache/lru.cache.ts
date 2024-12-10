import { duration, JsonHelper } from '@ethos/helpers';
import { LRUCache } from 'lru-cache';
import { redis } from '../../data/redis.js';
import { metrics } from '../metrics.js';
import { FEATURE_GATES, getGlobalFeatureGate } from '../statsig.js';

const DEFAULT_MAX_CACHE_SIZE = 10000;
const DEFAULT_MAX_CACHE_DURATION = duration(1, 'hour').toMilliseconds();

// Add counter for cache operations
const cacheOperationsCounter = metrics.makeCounter({
  name: 'lru_cache_operations',
  help: 'Count of LRU cache operations (hits and misses)',
  labelNames: ['cache_name', 'operation', 'cache_type'],
});

/**
 * @param duration in milliseconds
 */
export function createLRUCache<T>(
  duration: number = DEFAULT_MAX_CACHE_DURATION,
): LRUCache<string, Promise<T>> {
  return new LRUCache<string, Promise<T>>({
    max: DEFAULT_MAX_CACHE_SIZE,
    ttl: duration,
  });
}

export async function cachedOperation<T, U>(
  cacheName: string,
  cache: LRUCache<string, Promise<U>>,
  key: T,
  operation: (key: T) => Promise<U>,
): Promise<U> {
  const isRedisEnabled = getGlobalFeatureGate(FEATURE_GATES.USE_REDIS_INSTEAD_OF_LRU);

  if (isRedisEnabled) {
    const cacheKey = `${cacheName}:${JSON.stringify(key)}`;

    const cached = await redis.get(cacheKey);

    if (cached) {
      const parsed = await JsonHelper.parseSafe<Promise<U>>(cached, {
        reviver: JsonHelper.reviver,
      });

      if (parsed) {
        cacheOperationsCounter.inc({
          cache_name: cacheName,
          operation: 'hit',
          cache_type: 'redis',
        });

        return parsed;
      }
    }

    cacheOperationsCounter.inc({
      cache_name: cacheName,
      operation: 'miss',
      cache_type: 'redis',
    });

    const result = await operation(key);

    await redis.setex(
      cacheKey,
      duration(cache.ttl, 'milliseconds').toSeconds(),
      JSON.stringify(result, JsonHelper.replacer),
    );

    return result;
  } else {
    const cacheKey = JSON.stringify(key);

    if (cache.has(cacheKey)) {
      const cachedResult = await cache.get(cacheKey);

      if (cachedResult !== undefined) {
        cacheOperationsCounter.inc({
          cache_name: cacheName,
          operation: 'hit',
          cache_type: 'lru',
        });

        return cachedResult;
      }
    }

    cacheOperationsCounter.inc({
      cache_name: cacheName,
      operation: 'miss',
      cache_type: 'lru',
    });
    const result = operation(key);
    cache.set(cacheKey, result);

    return await result;
  }
}
