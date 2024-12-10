import { type ContributionBundleModel } from '@ethos/domain';
import { type ContributionActionRequest } from '@ethos/echo-client';

export type ContributionRecordAction = ContributionActionRequest['action'] & {
  chosenUserkey?: string;
};

export function getReviewAnswer(action: ContributionRecordAction | null) {
  if (!action) return undefined;
  if (
    action.type === 'REVIEW_CHECK' ||
    action.type === 'SCORE_CHECK' ||
    action.type === 'TRUST_CHECK'
  ) {
    if (action.answer === 'POSITIVE') return 'positive';
    if (action.answer === 'NEGATIVE') return 'negative';
    if (action.answer === 'NEUTRAL') return 'neutral';
  }

  return undefined;
}

export function getVoteAnswer(action: ContributionRecordAction | null) {
  if (!action) return undefined;
  if (
    action.type === 'REVIEW_CHECK' ||
    action.type === 'SCORE_CHECK' ||
    action.type === 'TRUST_CHECK'
  ) {
    if (action.answer === 'POSITIVE') return 'upvote';
    if (action.answer === 'NEGATIVE') return 'downvote';
  }

  return undefined;
}

export type GetFirstPendingDetailsInput = {
  contributionData: ContributionBundleModel[];
  startingBundleIndex?: number;
  startingChainedItemIndex?: number;
  nextBundleIndexFallback?: number;
  nextChainedItemIndexFallback?: number;
  onFindFail?: () => void;
};

export type GetFirstPendingDetailsOutput = {
  bundleIndex: number;
  chainedItemIndex: number;
  hasPending: boolean;
};

export function getFirstPendingStepDetails({
  contributionData,
  startingBundleIndex = 0,
  startingChainedItemIndex = 0,
  nextBundleIndexFallback = -1,
  nextChainedItemIndexFallback = -1,
  onFindFail,
}: GetFirstPendingDetailsInput): GetFirstPendingDetailsOutput {
  let _nextChainedItemIndex = -1;
  const _nextBundleIndex = contributionData.findIndex((bundle, bIndex) => {
    if (bIndex < startingBundleIndex) return false;

    const pendingContributionIndex = bundle.contributions.findIndex((contribution, cIndex) => {
      if (cIndex < startingChainedItemIndex) return false;

      return contribution.status === 'PENDING';
    });

    if (pendingContributionIndex !== -1) {
      _nextChainedItemIndex = pendingContributionIndex;

      return true;
    }

    return false;
  });

  if (_nextBundleIndex === -1 || _nextChainedItemIndex === -1) {
    onFindFail?.();

    return {
      bundleIndex: nextBundleIndexFallback,
      chainedItemIndex: nextChainedItemIndexFallback,
      hasPending: false,
    };
  }

  return {
    bundleIndex: _nextBundleIndex,
    chainedItemIndex: _nextChainedItemIndex,
    hasPending: true,
  };
}
