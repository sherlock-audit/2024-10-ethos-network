import { css } from '@emotion/react';
import { type ProfileId } from '@ethos/blockchain-manager';
import { type EthosUserTarget, type VoteInfo } from '@ethos/domain';
import { getRelativeTime } from '@ethos/helpers';
import { Flex, Typography } from 'antd';
import { useState } from 'react';
import { UserAvatar } from '../../avatar/avatar.component';
import { PersonName } from '../../person-name/person-name.component';
import { CardFooter } from '../card-footer.component';
import { CommentReplies } from './comment-replies.component';
import { type CommentTarget } from './comment.types';
import { useBlockchainManager } from 'contexts/blockchain-manager.context';
import { useReplySummary } from 'hooks/api/echo.hooks';
import { useActor, useActivityVotes } from 'hooks/user/activities';

const { Text, Paragraph } = Typography;

export type CommentProps = {
  comment: {
    target: CommentTarget;
    text: string;
    timestamp: number;
    author: ProfileId;
  };
  depth: number;
  onReplyTargetChanged: (target: CommentTarget, author: EthosUserTarget) => void;
};

export function CommentCard({ comment, onReplyTargetChanged, depth }: CommentProps) {
  const { blockchainManager } = useBlockchainManager();
  const { data: voteData } = useActivityVotes({ discussion: [comment.target.id] });

  const author = useActor({ profileId: comment.author });
  const voteInfo: VoteInfo = voteData?.discussion?.[comment.target.id]?.counts ?? {
    upvotes: 0,
    downvotes: 0,
  };
  const currentVote = voteData?.discussion?.[comment.target.id].userVote ?? null;

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const { data: replySummary } = useReplySummary({
    parentId: comment.target.id,
    targetContract: blockchainManager.getContractAddress(comment.target.contract),
  });

  const handleToggleComments = () => {
    setIsCommentsOpen(!isCommentsOpen);
  };

  return (
    <Flex justify="stretch" gap={16}>
      <UserAvatar size={depth < 1 ? 'default' : 'small'} actor={author} />
      <Flex flex={1} vertical>
        <Flex
          align="center"
          justify="space-between"
          css={css`
            margin-bottom: 4px;
          `}
        >
          <PersonName
            ellipsis={true}
            target={author}
            weight="bold"
            color="colorText"
            showScore={depth >= 1}
            maxWidth="200px"
          />
          <Flex align="center">
            <Text type="secondary">{getRelativeTime(comment.timestamp) ?? 'Unknown'}</Text>
          </Flex>
        </Flex>
        <Paragraph>{comment.text}</Paragraph>
        <CardFooter
          targetId={comment.target.id}
          targetContract={comment.target.contract}
          votes={voteInfo}
          currentVote={currentVote}
          replySummary={replySummary}
          actions={
            depth < 1
              ? {
                  addReply: {
                    onAddReply: () => {
                      onReplyTargetChanged(comment.target, { profileId: comment.author });
                    },
                  },
                }
              : {}
          }
        />
        <CommentReplies
          depth={depth}
          comment={comment}
          isCommentsOpen={isCommentsOpen}
          onReplyTargetChanged={onReplyTargetChanged}
          replySummary={replySummary}
          toggleComments={handleToggleComments}
        />
      </Flex>
    </Flex>
  );
}
