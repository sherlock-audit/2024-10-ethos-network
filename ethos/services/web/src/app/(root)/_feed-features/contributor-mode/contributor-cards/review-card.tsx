import { type ScoreType } from '@ethos/blockchain-manager';
import { type ContributionReview, fromUserKey } from '@ethos/domain';
import { useCallback } from 'react';
import { ReviewPrompt } from '../components/action-prompt';
import { ContributionCardSkeleton } from '../components/contribution-card-skeleton';
import { ContributorProfileCard } from '../components/contributor-profile-card';
import {
  type OnContribute,
  useRecordContributionWithMsg,
} from '../hooks/useRecordContributionWithMsg';
import { useSkipContributionAction } from '../hooks/useSkipContributionAction';
import { useActor } from 'hooks/user/activities';

type ReviewCardProps = {
  action: ContributionReview;
  contributionId: number;
  onContribute: OnContribute;
  defaultReviewType?: ScoreType;
  defaultTargetUserkey?: string;
  earnableXP: number;
};

export function ReviewCard({
  action,
  contributionId,
  onContribute,
  defaultReviewType,
  defaultTargetUserkey,
  earnableXP,
}: ReviewCardProps) {
  const targetUserkey: string = defaultTargetUserkey ?? action.targetUserkeys[0];
  const actor = useActor(fromUserKey(targetUserkey));

  const { recordAction } = useRecordContributionWithMsg({ onContribute });
  const onSuccess = useCallback(
    (txHash: string) => {
      recordAction({
        contributionId,
        action: { type: 'REVIEW', txHash },
      });
    },
    [recordAction, contributionId],
  );

  const { skipAction } = useSkipContributionAction({ contributionId, onContribute });

  if (!actor) {
    return <ContributionCardSkeleton />;
  }

  return (
    <ContributorProfileCard
      actor={actor}
      footer={
        <ReviewPrompt
          onSkip={skipAction}
          reviewType={defaultReviewType}
          actor={actor}
          onSuccess={onSuccess}
          earnableXP={earnableXP}
        />
      }
    />
  );
}
