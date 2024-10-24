import { type Review } from '@ethos/blockchain-manager';
import { type BlockchainEvent } from '@ethos/domain';
import { type PaginatedResponse } from '@ethos/helpers';
import { z } from 'zod';
import { convert } from '../../data/conversion';
import { prisma } from '../../data/db';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';
import { validators } from '../service.validator';
import { paramsToWhere, reviewSchema } from './review.utils';

const orderBySchema = z.object({
  orderBy: z.record(z.enum(['createdAt', 'updatedAt']), z.enum(['asc', 'desc'])).optional(),
});

const schema = reviewSchema
  .merge(validators.paginationSchema({ maxLimit: 100 }))
  .merge(orderBySchema);

type Input = z.infer<typeof schema>;
type Output = PaginatedResponse<Review & { events: BlockchainEvent[] }>;

export class ReviewQuery extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute(searchBy: Input): Promise<Output> {
    const where = await paramsToWhere(searchBy);

    const [count, data] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        orderBy: searchBy.orderBy ?? { createdAt: 'desc' },
        take: searchBy.pagination.limit,
        skip: searchBy.pagination.offset,
        include: {
          ReviewEvent: {
            include: {
              event: true,
            },
            orderBy: {
              event: { createdAt: 'asc' },
            },
          },
        },
      }),
    ]);

    const values = data.map((x) => {
      const r = convert.toReview(x);
      const events = x.ReviewEvent.map((x) => convert.toBlockchainEvent(x.event));

      return { ...r, events };
    });

    return {
      values,
      limit: searchBy.pagination.limit,
      offset: searchBy.pagination.offset,
      total: count,
    };
  }
}
