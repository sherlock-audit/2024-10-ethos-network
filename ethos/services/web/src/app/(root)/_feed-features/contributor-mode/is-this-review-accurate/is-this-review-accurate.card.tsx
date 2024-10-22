import { css } from '@emotion/react';
import { type ReviewActivityInfo } from '@ethos/domain';
import { Card, Flex, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { UpvoteDownvotePrompt } from '../components/action-prompt';
import { FeedbackActions } from '../components/feedback-actions';
import { contributorModeCard, getCardWidthStyles } from '../styles';
import { CardHeaderTitle } from 'components/activity-cards/card-header-title.component';
import { CardHeader } from 'components/activity-cards/card-header.component';
import { UserAvatar } from 'components/avatar/avatar.component';
import { ExpandableParagraph } from 'components/expandable-paragraph/expandable-paragraph.component';
import { tokenCssVars } from 'config';
import { parseReviewMetadata } from 'hooks/api/blockchain-manager/metadata.utils';
import { useScoreIconAndColor } from 'hooks/user/useScoreIconAndColor';
import { truncateTitle } from 'utils/truncate-title';

const { Title, Paragraph } = Typography;

const cardBodyPaddingX = 12;
const { cardWidth } = getCardWidthStyles({
  cardWidth: 352,
  cardBodyPadding: cardBodyPaddingX,
});

export function IsThisReviewAccurateCard({
  reviewInfo,
  onNext,
}: {
  reviewInfo: ReviewActivityInfo;
  onNext: () => void;
}) {
  const { data: review, author, subject } = reviewInfo;
  const { COLOR_BY_SCORE } = useScoreIconAndColor();

  const reviewTitle = truncateTitle(review.comment);
  const { description } = parseReviewMetadata(review?.metadata);
  const [upvoteDownvoteType, setUpvoteDownvoteType] = useState<'upvote' | 'downvote' | null>(null);

  const onSuccess = useCallback(() => {
    setUpvoteDownvoteType(null);
    onNext();
  }, [onNext]);

  return (
    <Card
      css={css`
        ${contributorModeCard}
        width: ${cardWidth};
      `}
      styles={{
        body: {
          padding: 0,
        },
      }}
    >
      <CardHeader
        wrapperCSS={css`
          padding: 12px;
          justify-content: center;
          width: 100%;
          align-items: center;
        `}
        isPreview
        title={
          <CardHeaderTitle
            flexContainerStyles={css`
              align-items: baseline;
            `}
            author={author}
            subject={subject}
            type="review"
            score={review.score}
            color={COLOR_BY_SCORE[review.score]}
          />
        }
      />
      <Flex
        gap={18}
        flex={1}
        css={css`
          padding: 26px ${cardBodyPaddingX}px ${description ? '17px' : '29px'} ${cardBodyPaddingX}px;
        `}
      >
        <UserAvatar size="large" actor={author} />
        <Flex vertical flex={1}>
          <Paragraph>
            <Title level={4}>&ldquo;{reviewTitle}&rdquo;</Title>
          </Paragraph>
          {description ? <ExpandableParagraph>{description}</ExpandableParagraph> : null}
        </Flex>
      </Flex>
      <Flex
        align="center"
        justify="center"
        css={css`
          padding: 18px ${cardBodyPaddingX}px 22px ${cardBodyPaddingX}px;
          border-top: 1px solid ${tokenCssVars.colorBgLayout};
        `}
      >
        {upvoteDownvoteType ? (
          <UpvoteDownvotePrompt
            onSkip={onNext}
            type={upvoteDownvoteType}
            reviewId={review.id}
            onSuccess={onSuccess}
          />
        ) : (
          <FeedbackActions
            variant="arrows"
            onThumbsUp={() => {
              setUpvoteDownvoteType('upvote');
            }}
            onThumbsDown={() => {
              setUpvoteDownvoteType('downvote');
            }}
            onNeutral={onNext}
            onNotSure={onNext}
          />
        )}
      </Flex>
    </Card>
  );
}
