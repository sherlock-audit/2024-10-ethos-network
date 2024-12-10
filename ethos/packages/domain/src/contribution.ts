export const ANSWER_XP = 10;
export const VOTE_XP = 50;
export const REVIEW_XP = 90;
export const TOTAL_STEPS = 5;
export const STREAKS_XP_MULTIPLIER_MAP: Array<{ day: number; multiplier: number }> = [
  { day: 1, multiplier: 1.5 },
  { day: 3, multiplier: 2.5 },
  { day: 5, multiplier: 3.5 },
  { day: 7, multiplier: 5 },
];
export const DAILY_CONTRIBUTION_LIMIT = 7;

export const CONTRIBUTION_ANSWER_TYPES = ['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'UNSURE'] as const;
export const CONTRIBUTION_STATUS = ['PENDING', 'COMPLETED', 'SKIPPED'] as const;

export type ContributionBundleModel = {
  id: number;
  contributions: ContributionModel[];
};

export type ContributionModel = {
  id: number;
  experience: number;
  status: (typeof CONTRIBUTION_STATUS)[number];
  action: ContributionAction;
};

export type ContributionAction =
  | ({ type: 'REVIEW' } & ContributionReview)
  | ({ type: 'TRUST_BATTLE' } & ContributionTrustBattle)
  | ({ type: 'TRUST_CHECK' } & ContributionTrustCheck)
  | ({ type: 'REVIEW_CHECK' } & ContributionReviewCheck)
  | ({ type: 'SCORE_CHECK' } & ContributionScoreCheck)
  | ({ type: 'REVIEW_VOTE' } & ContributionReviewVote);

export type ContributionType = ContributionAction['type'];
export type ContributionAnswer = (typeof CONTRIBUTION_ANSWER_TYPES)[number];

export type ContributionReview = {
  targetUserkeys: string[];
  reviewId: number | null;
};

export type ContributionTrustBattle = {
  targetUserkeys: string[];
  chosenIndex: number | null;
};

export type ContributionTrustCheck = {
  targetUserkey: string;
  answer: ContributionAnswer | null;
};

export type ContributionScoreCheck = {
  targetUserkey: string;
  answer: ContributionAnswer | null;
};

export type ContributionReviewCheck = {
  reviewId: number;
  answer: ContributionAnswer | null;
};

export type ContributionReviewVote = {
  reviewId: number;
  voteId: number | null;
};

export type ContributionStats = {
  canGenerateDailyContributions: boolean;
  resetTimestamp: number;
  totalCount: number;
  completedCount: number;
  skippedCount: number;
  pendingCount: number;
  pendingBundleCount: number;
  todayXp: number;
  pendingXp: number;
  totalXp: number;
  previousXpLookup: Partial<Record<number, number>>;
  previousBundleXpLookup: Partial<Record<number, number>>;
  streakDays: number;
  streakDaysOptimistic: number;
};

export function streakDaysToMultiplier(days: number): number {
  // "toSorted" caused a build error with typescript
  const higherStreaksFirst = [...STREAKS_XP_MULTIPLIER_MAP].sort((a, b) => b.day - a.day);

  return higherStreaksFirst.find((x) => x.day <= days)?.multiplier ?? 1;
}

export type BundleBuilderType = 'TRUST_REVIEW' | 'TRUST_BATTLE' | 'REVIEW_CHECK' | 'SCORE_CHECK';

export type BundleConfigItem = {
  type: BundleBuilderType;
  count: number;
};

export const BUNDLE_CONFIG: BundleConfigItem[] = [
  { type: 'TRUST_REVIEW', count: 1 },
  { type: 'TRUST_BATTLE', count: 1 },
  { type: 'REVIEW_CHECK', count: 4 },
  { type: 'SCORE_CHECK', count: 1 },
] as const;

// Validate that the total matches DAILY_CONTRIBUTION_LIMIT
const totalBundles = BUNDLE_CONFIG.reduce((sum, config) => sum + config.count, 0);

if (totalBundles !== DAILY_CONTRIBUTION_LIMIT) {
  throw new Error(
    `Bundle config total (${totalBundles}) must match DAILY_CONTRIBUTION_LIMIT (${DAILY_CONTRIBUTION_LIMIT})`,
  );
}
