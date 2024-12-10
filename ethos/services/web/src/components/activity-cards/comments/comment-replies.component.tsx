import { css } from '@emotion/react';
import { type EthosUserTarget } from '@ethos/domain';
import { Button, Flex } from 'antd';
import { type CommentTarget } from './comment.types';
import { Comments } from './comments.component';

type RepliesButtonProps = {
  text: string;
  onClick: () => void;
};

function RepliesButton({ text, onClick }: RepliesButtonProps) {
  return (
    <Button
      type="link"
      onClick={onClick}
      css={css`
        font-size: 12px;
        width: fit-content;
        padding: 0;
      `}
    >
      {text}
    </Button>
  );
}

type CommentRepliesProps = {
  isCommentsOpen: boolean;
  replySummary: { count: number };
  comment: { target: CommentTarget };
  depth: number;
  onReplyTargetChanged: (target: CommentTarget, author: EthosUserTarget) => void;
  toggleComments: () => void;
};

export function CommentReplies({
  isCommentsOpen,
  replySummary,
  comment,
  depth,
  onReplyTargetChanged,
  toggleComments,
}: CommentRepliesProps) {
  return (
    <>
      {!isCommentsOpen && replySummary.count > 0 && (
        <RepliesButton onClick={toggleComments} text={`View ${replySummary.count} Replies`} />
      )}
      {isCommentsOpen && (
        <Flex
          vertical
          css={css`
            margin-top: 18px;
          `}
        >
          <Comments
            target={comment.target}
            depth={depth + 1}
            onReplyTargetChanged={onReplyTargetChanged}
          />
          <RepliesButton onClick={toggleComments} text={`Hide ${replySummary.count} Replies`} />
        </Flex>
      )}
    </>
  );
}
