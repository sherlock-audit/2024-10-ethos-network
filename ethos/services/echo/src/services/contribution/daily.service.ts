import {
  REVIEW_XP,
  ANSWER_XP,
  BUNDLE_CONFIG,
  type BundleBuilderType,
  VOTE_XP,
  streakDaysToMultiplier,
  fromUserKey,
  toUserKey,
} from '@ethos/domain';
import { type Prisma } from '@prisma-pg/client';
import { addDays } from 'date-fns';
import { z } from 'zod';
import { DYNAMIC_CONFIGS, getGlobalDynamicConfig } from '../../common/statsig.js';
import { prisma } from '../../data/db.js';
import { getTargetScoreXpMultiplier } from '../../data/score/xp.js';
import { Service } from '../service.base.js';
import { ServiceError } from '../service.error.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';
import { TwitterUser } from '../twitter/user.service.js';
import { getDailyRange, getStreakDays } from './utils.js';

export const createSchema = z.object({
  profileId: validators.profileId,
});

type Input = z.infer<typeof createSchema>;
type Output = { contributionBundleIds: number[] };

export class ContributionDailyService extends Service<typeof createSchema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, createSchema);
  }

  async execute({ profileId }: Input): Promise<Output> {
    const dailyRange = getDailyRange();

    const cnt = await prisma.contributionBundle.count({
      where: { profileId, expireAt: { gt: dailyRange.start, lte: dailyRange.end } },
    });

    if (cnt > 0) {
      throw ServiceError.BadRequest('daily tasks already generated', {
        code: 'DAILY_TASKS_ALREADY_GENERATED',
      });
    }

    const streakDays = await getStreakDays(profileId);
    const multiplier = streakDaysToMultiplier(streakDays);

    const contributionBundleIds: number[] = [];
    const bundles: BundleBuilderContribution[][] = [];

    for (const config of BUNDLE_CONFIG) {
      for (let i = 0; i < config.count; i++) {
        const tasks = await this.BUNDLE_BUILDERS[config.type]();
        bundles.push(tasks);
      }
    }

    const pointsMultiplier = await getTargetScoreXpMultiplier({
      profileId,
    });

    await prisma.$transaction(async (tx) => {
      for (const bundle of bundles) {
        const contributionBundle = await tx.contributionBundle.create({
          data: {
            profileId,
            expireAt: dailyRange.end,
          },
        });

        contributionBundleIds.push(contributionBundle.id);

        for (const task of bundle) {
          task.experience *= multiplier * pointsMultiplier;
          await tx.contribution.create({
            data: { ...task, contributionBundleId: contributionBundle.id },
          });
        }
      }
    });

    return { contributionBundleIds };
  }

  readonly BUNDLE_BUILDERS: Record<BundleBuilderType, () => Promise<BundleBuilderContribution[]>> =
    {
      TRUST_REVIEW: async () => {
        const targetUserkey = await this.randomUserkeys(1).then((x) => x[0]);

        return [
          {
            type: 'TRUST_CHECK',
            experience: ANSWER_XP,
            status: 'PENDING',
            ContributionTrustCheck: { create: { targetUserkey } },
          },
          {
            type: 'REVIEW',
            experience: REVIEW_XP,
            status: 'PENDING',
            ContributionReview: { create: { targetUserkeys: [targetUserkey] } },
          },
        ];
      },
      TRUST_BATTLE: async () => {
        const targetUserkeys = await this.randomUserkeys(2);

        return [
          {
            type: 'TRUST_BATTLE',
            experience: ANSWER_XP,
            status: 'PENDING',
            ContributionTrustBattle: { create: { targetUserkeys } },
          },
          {
            type: 'REVIEW',
            experience: REVIEW_XP,
            status: 'PENDING',
            ContributionReview: { create: { targetUserkeys } },
          },
        ];
      },
      REVIEW_CHECK: async () => {
        let reviewId = await randomContributionReview();

        // couldn't find a review, try find a recent review
        if (reviewId === null) reviewId = await randomReview(addDays(new Date(), -7));
        // couldn't find a review, fallback to trust check
        if (reviewId === null) return await this.BUNDLE_BUILDERS.TRUST_REVIEW();

        return [
          {
            type: 'REVIEW_CHECK',
            experience: ANSWER_XP,
            status: 'PENDING',
            ContributionReviewCheck: { create: { reviewId } },
          },
          {
            type: 'REVIEW_VOTE',
            experience: VOTE_XP,
            status: 'PENDING',
            ContributionReviewVote: { create: { reviewId } },
          },
        ];
      },
      SCORE_CHECK: async () => {
        const targetUserkey = await this.randomUserkeys(1).then((x) => x[0]);

        return [
          {
            type: 'SCORE_CHECK',
            experience: ANSWER_XP,
            status: 'PENDING',
            ContributionScoreCheck: { create: { targetUserkey } },
          },
          {
            type: 'REVIEW',
            experience: REVIEW_XP,
            status: 'PENDING',
            ContributionReview: { create: { targetUserkeys: [targetUserkey] } },
          },
        ];
      },
    };

  async randomUserkeys(cnt: number): Promise<string[]> {
    const config = getGlobalDynamicConfig(DYNAMIC_CONFIGS.ACCOUNTS_FOR_CONTRIBUTOR_MODE);

    const targets = getRandom(config.targets, cnt);

    const processed = [];

    for (const userkey of targets) {
      let target = fromUserKey(userkey, true);

      if ('service' in target && 'username' in target && target.service === 'x.com') {
        const result = await this.useService(TwitterUser).run({ username: target.username });
        target = { service: target.service, account: result.id };
      }

      processed.push(toUserKey(target));
    }

    return processed;
  }
}

type BundleBuilderContribution = Omit<
  Prisma.ContributionUncheckedCreateInput,
  'contributionBundleId'
>;

type ReviewIds = Array<{
  id: number;
}>;

async function randomContributionReview(): Promise<number | null> {
  const results = await prisma.$queryRaw<ReviewIds>`
    SELECT "reviewId" as id
    FROM contribution_reviews
    WHERE "reviewId" IS NOT NULL
    ORDER BY random()
    LIMIT 1
  `;

  if (results.length === 0) return null;

  return results[0].id;
}

async function randomReview(afterDate: Date): Promise<number | null> {
  const results = await prisma.$queryRaw<ReviewIds>`
    SELECT id
    FROM reviews
    WHERE archived = false AND "createdAt" > ${afterDate}
    ORDER BY random()
    LIMIT 1
  `;

  if (results.length === 0) return null;

  return results[0].id;
}

function getRandom<T>(arr: T[], n: number): T[] {
  const result = new Array<T>(n);
  const taken = new Array<number>(n);
  let len = arr.length;

  if (n > len) throw new RangeError('getRandom: more elements taken than available');
  while (n--) {
    const x = Math.floor(Math.random() * len);
    result[n] = arr[x in taken ? taken[x] : x];
    taken[x] = --len in taken ? taken[len] : len;
  }

  return result;
}
