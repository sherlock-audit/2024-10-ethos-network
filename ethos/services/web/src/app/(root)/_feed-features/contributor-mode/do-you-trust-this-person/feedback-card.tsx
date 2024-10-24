import { type ScoreType } from '@ethos/blockchain-manager';
import { useState, useCallback } from 'react';
import { ReviewPrompt } from '../components/action-prompt';
import { ContributorProfileCard } from '../components/contributor-profile-card';
import { FeedbackActions } from '../components/feedback-actions';
import { type ActivityActor } from 'services/echo';

type DoYouTrustThisPersonCardProps = {
  actor: ActivityActor;
  onNext: () => void;
  defaultReviewType?: ScoreType;
};

export function DoYouTrustThisPersonCard({
  actor,
  onNext,
  defaultReviewType,
}: DoYouTrustThisPersonCardProps) {
  const [reviewType, setReviewType] = useState<ScoreType | undefined>(defaultReviewType);

  const onSuccess = useCallback(() => {
    setReviewType(undefined);
    onNext();
  }, [onNext]);

  return (
    <ContributorProfileCard
      actor={actor}
      footer={
        reviewType ? (
          <ReviewPrompt
            onSkip={onSuccess}
            reviewType={reviewType}
            actor={actor}
            onSuccess={onSuccess}
          />
        ) : (
          <FeedbackActions
            variant="emoji"
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
