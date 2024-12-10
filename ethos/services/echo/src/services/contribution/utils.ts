import { type ContributionAction, type ContributionModel } from '@ethos/domain';
import { type Prisma, type ContributionType } from '@prisma-pg/client';
import { addDays } from 'date-fns';
import { prisma } from '../../data/db.js';
import { ServiceError } from '../service.error.js';

export type ContributionDefaultPayload = Prisma.ContributionGetPayload<{
  include: typeof DEFAULT_INCLUDE;
}>;

export function prismaToContribution(x: ContributionDefaultPayload): ContributionModel {
  return {
    id: x.id,
    status: x.status,
    experience: x.experience,
    action: prismaToContributionAction(x),
  };
}

export const DEFAULT_INCLUDE: Record<Exclude<keyof Prisma.ContributionInclude, 'Profile'>, true> = {
  ContributionBundle: true,
  ContributionReview: true,
  ContributionTrustBattle: true,
  ContributionTrustCheck: true,
  ContributionScoreCheck: true,
  ContributionReviewCheck: true,
  ContributionReviewVote: true,
};

const CONTRIBUTION_TYPE_ACTION_MAP: Record<
  ContributionType,
  (x: ContributionDefaultPayload) => ContributionAction | null
> = {
  REVIEW: (x) => {
    if (x.ContributionReview === null) return null;

    return {
      type: 'REVIEW',
      targetUserkeys: x.ContributionReview.targetUserkeys,
      reviewId: x.ContributionReview.reviewId,
    };
  },
  TRUST_BATTLE: (x) => {
    if (x.ContributionTrustBattle === null) return null;

    return {
      type: 'TRUST_BATTLE',
      targetUserkeys: x.ContributionTrustBattle.targetUserkeys,
      chosenIndex: x.ContributionTrustBattle.chosenIndex,
    };
  },
  TRUST_CHECK: (x) => {
    if (x.ContributionTrustCheck === null) return null;

    return {
      type: 'TRUST_CHECK',
      targetUserkey: x.ContributionTrustCheck.targetUserkey,
      answer: x.ContributionTrustCheck.answer,
    };
  },
  REVIEW_CHECK: (x) => {
    if (x.ContributionReviewCheck === null) return null;

    return {
      type: 'REVIEW_CHECK',
      reviewId: x.ContributionReviewCheck.reviewId,
      answer: x.ContributionReviewCheck.answer,
    };
  },
  REVIEW_VOTE: (x) => {
    if (x.ContributionReviewVote === null) return null;

    return {
      type: 'REVIEW_VOTE',
      reviewId: x.ContributionReviewVote.reviewId,
      voteId: x.ContributionReviewVote.voteId,
    };
  },
  SCORE_CHECK: (x) => {
    if (x.ContributionScoreCheck === null) return null;

    return {
      type: 'SCORE_CHECK',
      targetUserkey: x.ContributionScoreCheck.targetUserkey,
      answer: x.ContributionScoreCheck.answer,
    };
  },
};

function prismaToContributionAction(contribution: ContributionDefaultPayload): ContributionAction {
  const action = CONTRIBUTION_TYPE_ACTION_MAP[contribution.type](contribution);

  if (action === null)
    throw ServiceError.InternalServerError(`missing action`, {
      code: `MISSING_ACTION`,
    });

  return action;
}

export function getDailyRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = addDays(start, 1);

  return {
    start,
    end,
  };
}

export async function getStreakDays(profileId: number): Promise<number> {
  type StreakResults = Array<{
    is_streak_day: boolean;
    start_date: Date;
    end_date: Date;
    streak: bigint;
  }>;
  const dailyRange = getDailyRange();

  // https://stackoverflow.com/questions/77230244/how-do-i-calculate-length-of-streak
  // streaks are a "islands and gaps" problem
  const results = await prisma.$queryRaw<StreakResults>`
    WITH
    bundle_info AS (
      SELECT
        contribution_bundles.id,
        COUNT(*) FILTER (WHERE contributions.status = 'COMPLETED') = 0 as breaks_streak,
        date(contribution_bundles."expireAt") as expire_at
      FROM contribution_bundles
      INNER JOIN contributions on contributions."contributionBundleId" = contribution_bundles.id
      WHERE
        "profileId" = ${profileId} AND
        -- only include past contributions
        contribution_bundles."expireAt" <= date(${dailyRange.start})
      GROUP BY (contribution_bundles.id, date(contribution_bundles."expireAt"))
    ),
    day_info AS (
      SELECT
        SUM(bundle_info.breaks_streak::int) = 0 as is_streak_day,
        date(contribution_bundles."expireAt") as expire_at
      FROM contribution_bundles
      INNER JOIN bundle_info on bundle_info."id" = contribution_bundles.id
      GROUP BY date(contribution_bundles."expireAt")
    ),
    readability AS (
      SELECT *, expire_at - INTERVAL '1 day' * ROW_NUMBER() OVER(PARTITION BY (is_streak_day) ORDER BY expire_at) as grouping_set
      FROM day_info
    )

    SELECT
      is_streak_day,
      MIN(expire_at) as start_date,
      MAX(expire_at) as end_date,
      COUNT(*) as streak
    FROM readability
    WHERE is_streak_day = true
    GROUP BY is_streak_day, grouping_set
    HAVING
      -- previous day's streak
      MAX(expire_at) = date(${dailyRange.start})
    ORDER BY start_date desc
    LIMIT 1
  `;

  if (results.length === 0) return 0;

  return Number(results[0].streak);
}
