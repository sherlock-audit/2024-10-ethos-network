import { type ContributionModel } from '@ethos/domain';
import { type RefObject, useCallback, useRef } from 'react';
import { useContributionSteps } from '../contexts/contribution-steps.context';
import {
  ReviewCard,
  ReviewCheckCard,
  ScoreCheckCard,
  TrustBattleCard,
  TrustCheckCard,
} from '../contributor-cards';
import { type ContributionRecordAction, getReviewAnswer, getVoteAnswer } from '../helpers/steps';
import { type OnContribute } from '../hooks/useRecordContributionWithMsg';
import { type GetNextPendingBundleIndex } from './useContributorModeSteps';

function StepCard({
  contribution,
  onContribute,
  previousAction,
}: {
  contribution: ContributionModel;
  onContribute: OnContribute;
  previousAction: RefObject<ContributionRecordAction>;
}) {
  const { id, action } = contribution;
  switch (action.type) {
    case 'REVIEW':
      return (
        <ReviewCard
          contributionId={id}
          earnableXP={contribution.experience}
          action={action}
          onContribute={onContribute}
          defaultReviewType={getReviewAnswer(previousAction.current)}
          defaultTargetUserkey={
            previousAction.current?.type === 'TRUST_BATTLE'
              ? previousAction.current.chosenUserkey
              : undefined
          }
        />
      );

    case 'REVIEW_VOTE':
      return (
        <ReviewCheckCard
          type="vote"
          selectedVote={getVoteAnswer(previousAction.current)}
          contributionId={id}
          earnableXP={contribution.experience}
          action={action}
          onContribute={onContribute}
        />
      );
    case 'TRUST_BATTLE':
      return <TrustBattleCard contributionId={id} action={action} onContribute={onContribute} />;
    case 'TRUST_CHECK':
      return <TrustCheckCard contributionId={id} action={action} onContribute={onContribute} />;
    case 'REVIEW_CHECK':
      return (
        <ReviewCheckCard
          contributionId={id}
          earnableXP={contribution.experience}
          action={action}
          onContribute={onContribute}
          type="answer"
        />
      );
    case 'SCORE_CHECK':
      return <ScoreCheckCard contributionId={id} action={action} onContribute={onContribute} />;

    default: {
      const _exhaustiveCheck: string = action;

      throw new Error(`Unknown action type: ${_exhaustiveCheck}`);
    }
  }
}

export function StepContent({
  contributions,
  getNextPendingStepDetails,
}: {
  contributions: ContributionModel[];
  getNextPendingStepDetails: GetNextPendingBundleIndex;
}) {
  const previousAction = useRef<ContributionRecordAction | null>(null);
  const {
    setStepDetails,
    stepDetails: { chainedItemIndex },
  } = useContributionSteps();

  const onContribute: OnContribute = useCallback(
    (action) => {
      setStepDetails((prev) => {
        const isUnsure =
          ('answer' in action && action.answer === 'UNSURE') ||
          (action.type === 'TRUST_BATTLE' && action.chosenIndex === -1);

        const isLastItemInBundle = prev.chainedItemIndex === contributions.length - 1;

        if (isLastItemInBundle || isUnsure || action.type === 'SKIP') {
          return getNextPendingStepDetails({
            startingBundleIndex: prev.bundleIndex + 1,
            startingChainedItemIndex: 0,
            nextBundleIndexFallback: prev.bundleIndex,
            nextChainedItemIndexFallback: prev.chainedItemIndex,
          });
        }

        previousAction.current = action;

        return getNextPendingStepDetails({
          startingBundleIndex: prev.bundleIndex,
          startingChainedItemIndex: prev.chainedItemIndex + 1,
          nextBundleIndexFallback: prev.bundleIndex,
          nextChainedItemIndexFallback: prev.chainedItemIndex,
        });
      });
    },
    [setStepDetails, contributions.length, getNextPendingStepDetails],
  );

  const previousContribution = contributions[chainedItemIndex - 1];

  if (!previousAction.current && previousContribution?.action) {
    previousAction.current = previousContribution.action as ContributionRecordAction;
  }

  return (
    <StepCard
      contribution={contributions[chainedItemIndex]}
      onContribute={onContribute}
      previousAction={previousAction}
    />
  );
}
