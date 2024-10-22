import { type ReplySummary } from '@ethos/domain';
import { Prisma } from '@prisma/client';
import { type Address } from 'viem';
import { z } from 'zod';
import { prisma } from '../../data/db';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';
import { replyUtils } from './reply.utils';

const schema = replyUtils.baseSchema.merge(
  z.object({
    currentUserProfileId: z.number().positive().nullable(),
  }),
);

type Input = z.infer<typeof schema>;
type Output = Record<string, Record<number, ReplySummary>>;

export class ReplySummaryService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ targetContract, parentIds, currentUserProfileId }: Input): Promise<Output> {
    const where = replyUtils.paramsToWhere({
      targetContract,
      parentIds,
    });

    const output: Output = {};

    for (const parentId of parentIds) {
      const byContract = (output[targetContract] ??= {});
      byContract[parentId] = { count: 0, participated: false };
    }

    const countRows = await prisma.reply.groupBy({
      where,
      _count: { _all: true },
      by: ['targetContract', 'parentId'],
    });

    for (const row of countRows) {
      output[row.targetContract][row.parentId].count = row._count._all;
    }

    if (currentUserProfileId !== undefined) {
      type QueryResult = [{ count: number; rootContract: Address; rootParentId: number }];
      const participationRows = await prisma.$queryRaw<QueryResult>`
        WITH RECURSIVE partial_table(id, parentId, "authorProfileId", "rootParentId", "rootContract")
        AS(
            -- base case
            SELECT
              replies.id,
              replies."parentId",
              replies."authorProfileId",
              replies."parentId" as "rootParentId",
              replies."targetContract" as "rootContract"
            FROM replies
            WHERE replies."parentId" in (${Prisma.join(parentIds)}) AND replies."targetContract" = ${targetContract}

            UNION

            -- recursive query
            SELECT
              child.id,
              child."parentId",
              child."authorProfileId",
              partial_table."rootParentId" as "rootParentId",
              partial_table."rootContract" as "rootContract"
            FROM replies AS child
            INNER JOIN partial_table ON partial_table.id = child."parentId" AND child."targetContract" = ${this.blockchainManager.getContractAddress('discussion')}
        )

        SELECT
          COUNT(*) as count,
          "rootParentId",
          "rootContract"
        FROM partial_table
        WHERE "authorProfileId" = ${currentUserProfileId}
        GROUP BY "rootParentId", "rootContract"
      `;

      for (const row of participationRows) {
        output[row.rootContract][row.rootParentId].participated = row.count > 0;
      }
    }

    return output;
  }
}
