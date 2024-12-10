import { type ActivityActorWithXp } from '@ethos/domain';
import { z } from 'zod';
import { prisma } from '../../data/db.js';
import { getActors } from '../activity/utility.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';

const schema = z.object({});

type XPLeaderboardQueryParams = z.infer<typeof schema>;

export class XPLeaderboardQuery extends Service<typeof schema, ActivityActorWithXp[]> {
  validate(params: AnyRecord): XPLeaderboardQueryParams {
    return this.validator(params, schema);
  }

  async execute(): Promise<ActivityActorWithXp[]> {
    const leaderboard = await prisma.xpPointsHistory.groupBy({
      by: ['profileId'],
      _sum: {
        points: true,
      },
      orderBy: {
        _sum: {
          points: 'desc',
        },
      },
      take: 50, // Temporary until we support pagination
    });

    const leaderboardMap = new Map(
      leaderboard.map((entry) => [entry.profileId, entry._sum.points ?? 0]),
    );

    const profileIds = Array.from(leaderboardMap.keys());

    const actors = await getActors(profileIds.map((profileId) => ({ profileId })));

    const actorsWithXp = actors as ActivityActorWithXp[];

    for (const actor of actorsWithXp) {
      actor.totalXp = leaderboardMap.get(actor.profileId ?? 0) ?? 0;
    }

    return actorsWithXp;
  }
}
