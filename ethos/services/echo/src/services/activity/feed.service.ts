import { type ActivityInfo } from '@ethos/domain';
import { duration, type PaginatedResponse } from '@ethos/helpers';
import { type Logger } from '@ethos/logger';
import { z } from 'zod';
import { cachedOperation, createLRUCache } from '../../common/cache/lru.cache';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';
import { RecentActivityService } from './recent.activity.service';

const CACHE_DURATION = duration(1, 'minute');

const schema = z.object({
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
});

type Pagination = z.infer<typeof schema>;
type Output = PaginatedResponse<ActivityInfo>;

const feedCache = createLRUCache<Output>(CACHE_DURATION.toMilliseconds());

export class FeedService extends Service<typeof schema, Output> {
  private readonly recentActivityService: RecentActivityService;

  constructor({ logger }: { logger: Logger }) {
    super({ logger });
    this.recentActivityService = new RecentActivityService({ logger });
  }

  validate(params: AnyRecord): Pagination {
    return this.validator(params, schema);
  }

  async execute(input: Pagination): Promise<Output> {
    return await cachedOperation(
      'feed',
      feedCache,
      input,
      async () => await this.recentActivityService.fetch({ pagination: input }),
    );
  }
}
