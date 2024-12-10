import { css } from '@emotion/react';
import { reviewContractName } from '@ethos/contracts';
import { type ContributionReviewVote, type ContributionReviewCheck } from '@ethos/domain';
import { Card, Flex, Typography } from 'antd';
import { useCallback, useMemo } from 'react';
import { UpvoteDownvotePrompt } from '../components/action-prompt';
import { ContributionCardSkeleton } from '../components/contribution-card-skeleton';
import { FeedbackActions } from '../components/feedback-actions';
import {
  useRecordContributionWithMsg,
  type OnContribute,
} from '../hooks/useRecordContributionWithMsg';
import { useSkipContributionAction } from '../hooks/useSkipContributionAction';
import { contributorModeCard, getCardWidthStyles } from '../styles';
import { CardHeaderTitle } from 'components/activity-cards/card-header-title.component';
import { CardHeader } from 'components/activity-cards/card-header.component';
import { UserAvatar } from 'components/avatar/avatar.component';
import { ExpandableParagraph } from 'components/expandable-paragraph/expandable-paragraph.component';
import { tokenCssVars } from 'config/theme';
import { useVoteFor } from 'hooks/api/blockchain-manager';
import { parseReviewMetadata } from 'hooks/api/blockchain-manager/metadata.utils';
import { useActivity } from 'hooks/user/activities';
import { useScoreIconAndColor } from 'hooks/user/useScoreIconAndColor';
import { truncateTitle } from 'utils/truncate-title';

const { Title, Paragraph } = Typography;

const cardBodyPaddingX = 12;
const { cardWidth } = getCardWidthStyles({
  cardWidth: 352,
  cardBodyPadding: cardBodyPaddingX,
});

export function ReviewCheckCard({
  action,
  contributionId,
  onContribute,
  type,
  selectedVote,
  earnableXP,
}: {
  action: ContributionReviewCheck | ContributionReviewVote;
  contributionId: number;
  onContribute: OnContribute;
  type: 'answer' | 'vote';
  selectedVote?: 'upvote' | 'downvote';
  earnableXP: number;
}) {
  const { data: review } = useActivity('review', action.reviewId);
  const { COLOR_BY_SCORE } = useScoreIconAndColor();

  const { description } = parseReviewMetadata(review?.data.metadata);
  const { skipAction } = useSkipContributionAction({ contributionId, onContribute });
  const { recordAction } = useRecordContributionWithMsg({ onContribute });
  const voteFor = useVoteFor(reviewContractName);

  const onVote = useCallback(
    async (isUpvote: boolean) => {
      const result = await voteFor.mutateAsync({
        id: action.reviewId,
        isUpvote,
      });
      await recordAction({
        contributionId,
        action: { type: 'REVIEW_VOTE', txHash: result.hash },
      });
    },
    [recordAction, voteFor, contributionId, action.reviewId],
  );

  const actionComponent = useMemo(() => {
    if (type === 'answer') {
      return (
        <FeedbackActions
          variant="arrows"
          contributionId={contributionId}
          contributionType="REVIEW_CHECK"
          onContribute={onContribute}
        />
      );
    }
    if (selectedVote) {
      return (
        <UpvoteDownvotePrompt
          onSkip={skipAction}
          onVote={onVote}
          type={selectedVote}
          earnableXP={earnableXP}
        />
      );
    }

    return (
      <FeedbackActions
        variant="vote"
        contributionType="REVIEW_VOTE"
        contributionId={contributionId}
        onContribute={onContribute}
        onVote={onVote}
        onSkip={skipAction}
      />
    );
  }, [selectedVote, contributionId, onContribute, skipAction, type, onVote, earnableXP]);

  if (!review) {
    return <ContributionCardSkeleton width={cardWidth} />;
  }

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
            author={review.author}
            subject={review.subject}
            type="review"
            score={review.data.score}
            color={COLOR_BY_SCORE[review.data.score]}
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
        <UserAvatar size="large" actor={review.author} />
        <Flex vertical flex={1}>
          <Paragraph>
            <Title level={4}>&ldquo;{truncateTitle(review.data.comment)}&rdquo;</Title>
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
        {actionComponent}
      </Flex>
    </Card>
  );
}
