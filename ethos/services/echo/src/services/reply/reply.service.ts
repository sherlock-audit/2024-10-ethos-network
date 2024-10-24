import { type Reply } from '@ethos/blockchain-manager';
import { type PaginatedResponse } from '@ethos/helpers';
import { convert } from '../../data/conversion';
import { prisma } from '../../data/db';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';
import { replyUtils, type ValidReplyParams } from './reply.utils';

type Output = PaginatedResponse<Reply>;

export class ReplyQueryService extends Service<typeof replyUtils.paginationSchema, Output> {
  validate(params: AnyRecord): ValidReplyParams {
    return this.validator(params, replyUtils.paginationSchema);
  }

  async execute(searchBy: ValidReplyParams): Promise<Output> {
    const where = replyUtils.paramsToWhere(searchBy);

    const [count, data] = await Promise.all([
      prisma.reply.count({ where }),
      prisma.reply.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: searchBy.pagination?.limit,
        skip: searchBy.pagination?.offset,
      }),
    ]);

    return {
      values: data.map(convert.toReplyFromPrisma),
      limit: searchBy.pagination.limit,
      offset: searchBy.pagination.offset,
      total: count,
    };
  }
}
