import { type ScoreType } from '@ethos/blockchain-manager';
import { useCallback, useState } from 'react';
import { ReviewPrompt } from '../components/action-prompt';
import { ContributorProfileCard } from '../components/contributor-profile-card';
import { FeedbackActions } from '../components/feedback-actions';
import { type ActivityActor } from 'services/echo';

export function IsThisScoreRightCard({
  actor,
  onNext,
}: {
  actor: ActivityActor;
  onNext: () => void;
}) {
  const [reviewType, setReviewType] = useState<ScoreType | null>(null);

  const onSuccess = useCallback(() => {
    setReviewType(null);
    onNext();
  }, [onNext]);

  return (
    <ContributorProfileCard
      actor={actor}
      showScoreInBody={true}
      compact={true}
      footer={
        reviewType ? (
          <ReviewPrompt
            onSkip={onNext}
            reviewType={reviewType}
            actor={actor}
            onSuccess={onSuccess}
          />
        ) : (
          <FeedbackActions
            variant="text"
            onThumbsUp={() => {
              setReviewType('positive');
            }}
            onThumbsDown={() => {
              setReviewType('negative');
            }}
            onNeutral={() => {
              setReviewType('neutral');
            }}
            onNotSure={onNext}
          />
        )
      }
    />
  );
}
