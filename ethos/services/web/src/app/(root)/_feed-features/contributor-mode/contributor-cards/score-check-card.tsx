import { fromUserKey, type ContributionScoreCheck } from '@ethos/domain';
import { ContributionCardSkeleton } from '../components/contribution-card-skeleton';
import { ContributorProfileCard } from '../components/contributor-profile-card';
import { FeedbackActions } from '../components/feedback-actions';
import { type OnContribute } from '../hooks/useRecordContributionWithMsg';
import { useActor } from 'hooks/user/activities';

export function ScoreCheckCard({
  action,
  contributionId,
  onContribute,
}: {
  action: ContributionScoreCheck;
  contributionId: number;
  onContribute: OnContribute;
}) {
  const actor = useActor(fromUserKey(action.targetUserkey));

  if (!actor) {
    return <ContributionCardSkeleton />;
  }

  return (
    <ContributorProfileCard
      actor={actor}
      showScoreInBody={true}
      compact={false}
      footer={
        <FeedbackActions
          variant="text"
          contributionId={contributionId}
          contributionType="SCORE_CHECK"
          onContribute={onContribute}
        />
      }
    />
  );
}
