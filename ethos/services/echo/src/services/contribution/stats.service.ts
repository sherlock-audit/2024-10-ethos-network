import { type ContributionStats } from '@ethos/domain';
import { z } from 'zod';
import { prisma } from '../../data/db.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';
import { DEFAULT_INCLUDE, getDailyRange, getStreakDays } from './utils.js';

const contributionStatsSchema = z.object({
  profileId: validators.profileId,
});

type Input = z.infer<typeof contributionStatsSchema>;

export class ContributionStatsService extends Service<
  typeof contributionStatsSchema,
  ContributionStats
> {
  validate(params: AnyRecord): Input {
    return this.validator(params, contributionStatsSchema);
  }

  async execute({ profileId }: Input): Promise<ContributionStats> {
    const dailyRange = getDailyRange();

    const contributionBundles = await prisma.contributionBundle.findMany({
      where: { profileId, expireAt: { gt: dailyRange.start, lte: dailyRange.end } },
      include: { Contribution: { include: DEFAULT_INCLUDE } },
    });

    const contributions = contributionBundles.flatMap((x) => x.Contribution);

    const totalXp = await prisma.xpPointsHistory.aggregate({
      _sum: { points: true },
      where: { profileId },
    });

    const previousXpLookup: Partial<Record<number, number>> = {};
    const previousBundleXpLookup: Partial<Record<number, number>> = {};

    for (let i = 1; i < contributions.length; i++) {
      previousXpLookup[contributions[i].id] = contributions[i - 1].experience;
    }

    for (let i = 1; i < contributionBundles.length; i++) {
      previousBundleXpLookup[contributionBundles[i].id] = contributionBundles[
        i - 1
      ].Contribution.reduce((acc, c) => acc + (c.status === 'COMPLETED' ? c.experience : 0), 0);
    }

    const completedBundleCount = count(contributionBundles, (bundle) =>
      bundle.Contribution.some((contribution) => contribution.status === 'COMPLETED'),
    );

    const streakDays = await getStreakDays(profileId);

    const output: ContributionStats = {
      canGenerateDailyContributions: contributionBundles.length === 0,
      resetTimestamp: dailyRange.end.getTime(),
      totalCount: contributions.length,
      completedCount: count(contributions, (x) => x.status === 'COMPLETED'),
      skippedCount: count(contributions, (x) => x.status === 'SKIPPED'),
      pendingCount: count(contributions, (x) => x.status === 'PENDING'),
      pendingBundleCount: count(contributionBundles, (bundle) =>
        bundle.Contribution.some((contribution) => contribution.status === 'PENDING'),
      ),
      todayXp: contributions
        .filter((x) => x.status === 'COMPLETED')
        .reduce((acc, c) => acc + c.experience, 0),
      pendingXp: contributions
        .filter((x) => x.status === 'PENDING')
        .reduce((acc, c) => acc + c.experience, 0),
      previousXpLookup,
      previousBundleXpLookup,
      totalXp: totalXp._sum.points ?? 0,
      streakDays,
      streakDaysOptimistic: streakDays,
    };

    if (
      !output.canGenerateDailyContributions &&
      contributionBundles.length > 0 &&
      completedBundleCount === contributionBundles.length
    ) {
      output.streakDaysOptimistic += 1;
    }

    return output;
  }
}

function count<T>(arr: T[], f: (value: T) => boolean): number {
  let result = 0;

  for (const value of arr) {
    if (f(value)) result++;
  }

  return result;
}
