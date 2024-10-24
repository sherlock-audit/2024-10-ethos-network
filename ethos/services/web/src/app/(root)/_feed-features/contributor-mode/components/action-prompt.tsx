import { css } from '@emotion/react';
import { Score, type ScoreType } from '@ethos/blockchain-manager';
import { reviewContractName } from '@ethos/contracts';
import { fromUserKey, type ActivityActor } from '@ethos/domain';
import { Button, Flex, Typography } from 'antd';
import { useState } from 'react';
import { ReviewModal } from 'app/(root)/profile/_components/review-modal/review-modal.component';
import { tokenCssVars } from 'config';
import { useVoteFor } from 'hooks/api/blockchain-manager';

function ActionPrompt({
  onSkip,
  onAction,
  actionLabel,
  actionDescription,
}: {
  onSkip: () => void;
  onAction: () => void;
  actionLabel: string;
  actionDescription: string;
}) {
  return (
    <Flex vertical gap={12} align="center">
      <Button
        type="primary"
        onClick={onAction}
        css={css`
          display: flex;
          height: auto;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 13px 20px;
          * {
            color: ${tokenCssVars.colorBgContainer};
          }
        `}
      >
        <Typography.Title level={3}>{actionLabel}</Typography.Title>
        <Typography.Text>{actionDescription}</Typography.Text>
      </Button>
      <Button type="link" onClick={onSkip}>
        Skip & continue
      </Button>
    </Flex>
  );
}

export function ReviewPrompt({
  onSkip,
  reviewType,
  onSuccess,
  actor,
}: {
  onSkip: () => void;
  reviewType: ScoreType;
  onSuccess: () => void;
  actor: ActivityActor;
}) {
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const target = fromUserKey(actor.userkey);

  return (
    <>
      <ActionPrompt
        onSkip={onSkip}
        onAction={() => {
          setReviewModalOpen(true);
        }}
        actionLabel="Leave a review"
        actionDescription="and get 90 more XP"
      />
      <ReviewModal
        target={target}
        isOpen={reviewModalOpen}
        close={(isSuccessful) => {
          setReviewModalOpen(false);

          if (isSuccessful) {
            onSuccess();
          }
        }}
        defaultScore={Score[reviewType]}
      />
    </>
  );
}

export function UpvoteDownvotePrompt({
  onSkip,
  type,
  reviewId,
  onSuccess,
}: {
  onSkip: () => void;
  type: 'upvote' | 'downvote';
  reviewId: number;
  onSuccess: () => void;
}) {
  const voteFor = useVoteFor(reviewContractName);
  const voteAction = async () => {
    await voteFor.mutateAsync(
      { id: reviewId, isUpvote: type === 'upvote' },
      {
        onSuccess,
      },
    );
  };

  return (
    <ActionPrompt
      onSkip={onSkip}
      onAction={async () => {
        await voteAction();
      }}
      actionLabel={type === 'upvote' ? 'Upvote the review' : 'Downvote the review'}
      actionDescription="and get 50 more XP"
    />
  );
}
