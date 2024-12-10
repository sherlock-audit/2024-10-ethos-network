import { type ProfileId } from '@ethos/blockchain-manager';
import { z } from 'zod';
import { prisma } from '../../data/db.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

const schema = z.object({
  subjectProfileId: validators.profileId,
  limit: z.number().int().max(50).default(4),
});

type CredibleVouchers = {
  authorProfileId: ProfileId;
  vouchId: number;
  score: number;
};

type Input = z.infer<typeof schema>;
type Output = CredibleVouchers[];

export class MostCredibleVouchers extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ subjectProfileId, limit }: Input): Promise<Output> {
    const credibleVouchers = await prisma.$queryRaw<CredibleVouchers[]>`
      WITH common_table as (
        SELECT DISTINCT ON (target) target, score
        FROM score_history
        ORDER BY target, "createdAt" DESC
      )

      SELECT vouches."authorProfileId", vouches.id as "vouchId", common_table.score
      FROM vouches
      -- can't use toUserKey inside SQL query, CONCAT instead
      INNER JOIN common_table on common_table.target = CONCAT('profileId:', vouches."authorProfileId")
      WHERE
        vouches."subjectProfileId" = ${subjectProfileId} AND
        vouches."archived" = false
      ORDER BY common_table."score" DESC
      LIMIT ${limit}
    `;

    return credibleVouchers;
  }
}
