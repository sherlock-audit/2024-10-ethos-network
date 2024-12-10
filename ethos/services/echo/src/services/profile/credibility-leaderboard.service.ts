import { type ActivityActor, fromUserKey } from '@ethos/domain';
import { Prisma } from '@prisma-pg/client';
import { z } from 'zod';
import { prisma } from '../../data/db.js';
import { getActors } from '../activity/utility.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';

const schema = z.object({
  order: z.enum(['asc', 'desc']).default('desc'),
});

type CredibilityLeaderboardQueryParams = z.infer<typeof schema>;

export class CredibilityLeaderboardQuery extends Service<typeof schema, ActivityActor[]> {
  validate(params: AnyRecord): CredibilityLeaderboardQueryParams {
    return this.validator(params, schema);
  }

  async execute(params: CredibilityLeaderboardQueryParams): Promise<ActivityActor[]> {
    const scores: Array<{ target: string; score: number }> = await prisma.$queryRaw`
    SELECT target, score
    FROM (
        SELECT DISTINCT ON (target) target, score
        FROM score_history AS sh
        WHERE sh."target" LIKE 'profileId:%'
        ORDER BY sh."target", sh."createdAt" DESC
    ) AS subquery
    ORDER BY score ${params.order === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`}
    LIMIT 70;
  `;

    const targets = scores.map((historyItem) => fromUserKey(historyItem.target));
    let actors = await getActors(targets);

    // Temp fix for score history by address that also has a profile (let's see how temporary this will actually be :D)
    actors = actors.filter((actor, index) => actor.score === scores[index].score).slice(0, 50);

    return actors;
  }
}
