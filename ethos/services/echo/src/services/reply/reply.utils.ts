import { type Prisma } from '@prisma/client';
import { z } from 'zod';
import { validators } from '../service.validator';

// TODO add a validator for targetContract values (or at least contract names)
const baseSchema = z.object({
  targetContract: validators.address,
  parentIds: z.array(z.number().nonnegative()),
});

const paginationSchema = baseSchema.merge(validators.paginationSchema({ maxLimit: 100 }));

export type ReplyQueryParams = z.input<typeof paginationSchema>;
export type ValidReplyParams = z.infer<typeof paginationSchema>;

function paramsToWhere(searchBy: Omit<ReplyQueryParams, 'pagination'>): Prisma.ReplyWhereInput {
  return {
    targetContract: { equals: searchBy.targetContract, mode: 'insensitive' },
    parentId: { in: searchBy.parentIds },
  };
}

export const replyUtils = {
  paramsToWhere,
  baseSchema,
  paginationSchema,
};
