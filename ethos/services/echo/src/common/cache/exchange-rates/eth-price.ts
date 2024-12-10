import { JsonHelper, duration } from '@ethos/helpers';
import { redis } from '../../../data/redis.js';
import { type CacheConfig } from '../cache.types.js';

const ETH_PRICE_TTL = duration(10, 'minutes').toSeconds();

export const ethPriceCache = {
  key() {
    return 'eth_price';
  },

  ttl: ETH_PRICE_TTL,
  async get<T = number>() {
    const data = await redis.get(this.key());
    const parsed = JsonHelper.parseSafe<T>(data);

    return parsed;
  },
  async set(price: number) {
    await redis.setex(this.key(), this.ttl, JSON.stringify(price));
  },
  async delete() {
    await redis.del(this.key());
  },
} satisfies CacheConfig;
