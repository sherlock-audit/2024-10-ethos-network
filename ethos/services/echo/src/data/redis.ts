import { type RedisOptions, Redis } from 'ioredis';
import Redlock from 'redlock';
import { config } from '../common/config';
import { rootLogger } from '../common/logger';

const logger = rootLogger.child({ module: 'redis' });

const redisOptions: RedisOptions = {
  // https://github.com/redis/ioredis/issues/1576#issuecomment-1158910923
  family: config.NODE_ENV === 'production' ? 6 : 4,
};

export const redis = new Redis(config.REDIS_URL, redisOptions);

redis.on('ready', () => {
  logger.info('🗄 redis_ready');
});

export const redlock = new Redlock(
  // You should have one client for each independent redis node
  // or cluster.
  [redis],
  {
    // The expected clock drift; for more details see:
    // http://redis.io/topics/distlock
    driftFactor: 0.01, // multiplied by lock ttl to determine drift time

    // The max number of times Redlock will attempt to lock a resource
    // before erroring.
    retryCount: 10,

    // the time in ms between attempts
    retryDelay: 200, // time in ms

    // the max time in ms randomly added to retries
    // to improve performance under high contention
    // see https://www.awsarchitectureblog.com/2015/03/backoff.html
    retryJitter: 200, // time in ms

    // The minimum remaining time on a lock before an extension is automatically
    // attempted with the `using` API.
    automaticExtensionThreshold: 500, // time in ms
  },
);
