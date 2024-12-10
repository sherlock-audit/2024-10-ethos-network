import { type ScoreType } from '@ethos/blockchain-manager';
import { type ContributionTrustCheck, fromUserKey } from '@ethos/domain';
import { ContributionCardSkeleton } from '../components/contribution-card-skeleton';
import { ContributorProfileCard } from '../components/contributor-profile-card';
import { FeedbackActions } from '../components/feedback-actions';
import { type OnContribute } from '../hooks/useRecordContributionWithMsg';
import { useActor } from 'hooks/user/activities';

type TrustCheckCardProps = {
  action: ContributionTrustCheck;
  contributionId: number;
  onContribute: OnContribute;
  defaultReviewType?: ScoreType;
};

export function TrustCheckCard({ action, contributionId, onContribute }: TrustCheckCardProps) {
  const actor = useActor(fromUserKey(action.targetUserkey));

  if (!actor) {
    return <ContributionCardSkeleton />;
  }

  return (
    <ContributorProfileCard
      actor={actor}
      footer={
        <FeedbackActions
          variant="emoji"
          contributionId={contributionId}
          contributionType="TRUST_CHECK"
          onContribute={onContribute}
        />
      }
    />
  );
}
