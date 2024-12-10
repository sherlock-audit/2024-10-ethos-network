import { activities, type ActivityType, type ActivityInfo } from '@ethos/domain';
import { duration, type BatchPaginatedResponse } from '@ethos/helpers';
import { z } from 'zod';
import { cachedOperation, createLRUCache } from '../../common/cache/lru.cache.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';
import { type ActivityMetadata, type ActivityQueryOutput } from './query/activity-query.js';
import { attestationActivityQuery } from './query/attestation-activity.js';
import { invitationAcceptedActivityQuery } from './query/invitation-accepted-activity.js';
import { reviewActivityQuery } from './query/review-activity.js';
import { unvouchActivityQuery } from './query/unvouch-activity.js';
import { vouchActivityQuery } from './query/vouch-activity.js';
import { sharedFilterSchema, type ActivityQuery } from './utility.js';

const schema = z
  .object({
    filter: z.enum(activities).array().optional(),
    ids: z.record(z.enum(activities), z.number().array()).optional(),
    cache: z.boolean().optional().default(false),
    pagination: validators.batchPaginationSchema(activities),
  })
  .merge(sharedFilterSchema);

type Input = z.infer<typeof schema>;
type Output = BatchPaginatedResponse<ActivityType, ActivityInfo>;

const ACTIVITY_QUERY_LOOKUP: Record<ActivityType, ActivityQuery<any, ActivityInfo>> = {
  attestation: attestationActivityQuery,
  'invitation-accepted': invitationAcceptedActivityQuery,
  review: reviewActivityQuery,
  vouch: vouchActivityQuery,
  unvouch: unvouchActivityQuery,
};

const ORDER_BY_SORT_MAP: Record<
  Input['orderBy']['field'],
  {
    querySort: (a: ActivityMetadata, b: ActivityMetadata) => number;
    activitySort: (a: ActivityInfo, b: ActivityInfo) => number;
  }
> = {
  timestamp: {
    querySort: (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    activitySort: (a, b) => a.timestamp - b.timestamp,
  },
  votes: {
    querySort: (a, b) => a.votes.upvotes - b.votes.upvotes,
    activitySort: (a, b) => a.votes.upvotes - b.votes.upvotes,
  },
};

const CACHE_DURATION = duration(1, 'minute');
const activityCache = createLRUCache<Output>(CACHE_DURATION.toMilliseconds());

export class UnifiedActivityService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute(input: Input): Promise<Output> {
    if (input.cache) {
      return await cachedOperation(
        'activity',
        activityCache,
        input,
        async () => await execute(input),
      );
    }

    return await execute(input);
  }
}

async function execute({ pagination, ...input }: Input): Promise<Output> {
  const filter = input.filter ?? activities;

  let totalCount = 0;

  // collect offset + limit entries for each type
  const sortArr = [];

  for (const type of filter) {
    const result = await ACTIVITY_QUERY_LOOKUP[type].query({
      ...input,
      ids: input.ids?.[type],
      pagination: { offset: pagination.offsets?.[type] ?? 0, limit: pagination.limit },
    });

    totalCount += result.totalCount;

    for (let i = 0; i < result.results.length; i++) {
      const value = result.results[i];
      sortArr.push({ type, value });
    }
  }

  // sort
  const sortFn = ORDER_BY_SORT_MAP[input.orderBy.field];
  sortArr.sort((a, b) =>
    input.orderBy.direction === 'asc'
      ? sortFn.querySort(a.value.metadata, b.value.metadata)
      : sortFn.querySort(b.value.metadata, a.value.metadata),
  );

  // select top limit
  const top = sortArr.slice(0, Math.min(sortArr.length, pagination.limit));

  const hydrateBatches: Record<string, ActivityQueryOutput<any>> = {};

  const counts: Partial<Record<ActivityType, number>> = {};

  // split by type
  for (const { type, value } of top) {
    counts[type] ??= 0;
    counts[type] += 1;

    hydrateBatches[type] ??= [];
    hydrateBatches[type].push(value);
  }

  const result = [];

  // batch hydrate
  for (const [type, values] of Object.entries(hydrateBatches)) {
    const hydrated = await ACTIVITY_QUERY_LOOKUP[type as ActivityType].hydrate(values);
    result.push(...hydrated);
  }

  // sort again because batch hydration breaks order
  result.sort((a, b) =>
    input.orderBy.direction === 'asc' ? sortFn.activitySort(a, b) : sortFn.activitySort(b, a),
  );

  return {
    values: result,
    limit: pagination.limit,
    offsets: pagination.offsets ?? {},
    total: totalCount,
    counts,
  };
}
