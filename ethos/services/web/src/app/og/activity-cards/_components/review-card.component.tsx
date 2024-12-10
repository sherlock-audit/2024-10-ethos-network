import { type ScoreType } from '@ethos/blockchain-manager';
import { type ReviewActivityInfo } from '@ethos/domain';
import { ActivityCard } from './activity-card.component';
import { getAvatar } from 'app/og/utils/avatar';
import { DislikeFilledSvg } from 'components/icons/dislike-filled.svg';
import { LikeDislikeSvg } from 'components/icons/like-dislike.svg';
import { LikeFilledSvg } from 'components/icons/like-filled.svg';
import { ReviewFilledSvg } from 'components/icons/review-filled.svg';
import { lightTheme } from 'config/theme';
import { parseReviewMetadata } from 'hooks/api/blockchain-manager/metadata.utils';

type ReviewCardProps = {
  review: ReviewActivityInfo;
};

export function ReviewCard({ review }: ReviewCardProps) {
  const { description } = parseReviewMetadata(review.data.metadata);

  return (
    <ActivityCard
      activityTypeIcon={
        <span style={{ display: 'flex', color: scoreToColor(review.data.score) }}>
          <ReviewFilledSvg />
        </span>
      }
      authorName={review.author.name}
      authorAvatar={getAvatar(review.author.avatar, review.author.primaryAddress)}
      authorScore={review.author.score}
      subjectName={review.subject.name}
      subjectAvatar={getAvatar(review.subject.avatar, review.subject.primaryAddress)}
      action={`${review.data.score}ly reviewed`}
      timestamp={review.timestamp}
      title={`“${review.data.comment}”`}
      description={description}
      statusBadge={
        <span style={{ display: 'flex', color: scoreToColor(review.data.score) }}>
          {scoreToIcon(review.data.score)}
        </span>
      }
      replies={review.replySummary.count}
      votes={review.votes.upvotes - review.votes.downvotes}
    />
  );
}

function scoreToColor(score: ScoreType) {
  switch (score) {
    case 'negative':
      return lightTheme.token.colorError;
    case 'neutral':
      return lightTheme.token.colorTextBase;
    case 'positive':
      return lightTheme.token.colorSuccess;
    default:
      throw new Error('Invalid score type');
  }
}

function scoreToIcon(score: ScoreType) {
  switch (score) {
    case 'negative':
      return <DislikeFilledSvg />;
    case 'neutral':
      return <LikeDislikeSvg />;
    case 'positive':
      return <LikeFilledSvg />;
    default:
      throw new Error('Invalid score type');
  }
}
