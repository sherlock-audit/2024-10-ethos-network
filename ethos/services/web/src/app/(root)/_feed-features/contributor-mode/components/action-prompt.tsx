import { css } from '@emotion/react';
import { Score, type ScoreType } from '@ethos/blockchain-manager';
import { fromUserKey, type ActivityActor } from '@ethos/domain';
import { Button, Flex, Typography } from 'antd';
import { useState } from 'react';
import { ReviewModal } from 'app/(root)/profile/_components/review-modal/review-modal.component';
import { tokenCssVars } from 'config/theme';

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
  reviewType = 'positive',
  onSuccess,
  actor,
  earnableXP,
}: {
  onSkip: () => void;
  reviewType?: ScoreType;
  onSuccess: (txHash: string) => void;
  actor: ActivityActor;
  earnableXP: number;
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
        actionDescription={`and get ${earnableXP} more XP`}
      />
      <ReviewModal
        target={target}
        isOpen={reviewModalOpen}
        hideConfirmation={true}
        close={async (isSuccessful, contractTransactionResponse) => {
          setReviewModalOpen(false);

          if (isSuccessful && contractTransactionResponse !== null) {
            onSuccess(contractTransactionResponse.hash);
          }
        }}
        defaultScore={reviewType ? Score[reviewType] : undefined}
      />
    </>
  );
}

export function UpvoteDownvotePrompt({
  onSkip,
  onVote,
  type,
  earnableXP,
}: {
  onSkip: () => void;
  onVote: (isUpvote: boolean) => Promise<void>;
  type: 'upvote' | 'downvote';
  earnableXP: number;
}) {
  return (
    <ActionPrompt
      onSkip={onSkip}
      onAction={async () => {
        await onVote(type === 'upvote');
      }}
      actionLabel={type === 'upvote' ? 'Upvote the review' : 'Downvote the review'}
      actionDescription={`and get ${earnableXP} more XP`}
    />
  );
}
