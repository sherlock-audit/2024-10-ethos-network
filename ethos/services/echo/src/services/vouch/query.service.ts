import { type VouchFunds, type Vouch } from '@ethos/blockchain-manager';
import { type BlockchainEvent } from '@ethos/domain';
import { type PaginatedResponse } from '@ethos/helpers';
import { z } from 'zod';
import { convert } from '../../data/conversion';
import { prisma } from '../../data/db';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';
import { validators } from '../service.validator';
import { paramsToWhere, vouchSchema } from './vouch.utils';

const orderBySchema = z.object({
  orderBy: z.record(z.enum(['vouchedAt', 'updatedAt']), z.enum(['asc', 'desc'])).optional(),
});

const schema = vouchSchema
  .merge(validators.paginationSchema({ maxLimit: 100 }))
  .merge(orderBySchema);

type Input = z.infer<typeof schema>;
type Output = PaginatedResponse<
  Vouch &
    VouchFunds & {
      mutualId: number | null;
      events: BlockchainEvent[];
    }
>;

export class VouchQuery extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute(searchBy: Input): Promise<Output> {
    const where = paramsToWhere(searchBy);

    const [count, data] = await Promise.all([
      prisma.vouch.count({ where }),
      prisma.vouch.findMany({
        where,
        orderBy: searchBy.orderBy ?? { vouchedAt: 'desc' },
        take: searchBy.pagination.limit,
        skip: searchBy.pagination.offset,
        include: {
          VouchEvent: {
            include: {
              event: true,
            },
          },
        },
      }),
    ]);

    const mutualVouches = await Promise.all(
      data.map(async (item) => {
        return {
          ...convert.toVouch(item),
          mutualId: item.mutualVouchId,
          events: item.VouchEvent.map((x) => convert.toBlockchainEvent(x.event)),
        };
      }),
    );

    return {
      values: mutualVouches,
      limit: searchBy.pagination.limit,
      offset: searchBy.pagination.offset,
      total: count,
    };
  }
}
