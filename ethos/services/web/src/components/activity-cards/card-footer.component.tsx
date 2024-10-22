import { type Vote } from '@ethos/blockchain-manager';
import { type TargetContract } from '@ethos/contracts';
import { type ReplySummary, type VoteInfo } from '@ethos/domain';
import { Flex } from 'antd';
import { useState } from 'react';
import { type ActionProps, ActivityActions } from './actions/actions.component';
import { FeedActionSizes } from './actions/actions.type';
import { CommentsDrawer } from './comments/drawer.component';

type Props = {
  targetId: number;
  targetContract: TargetContract;
  actions?: ActionProps['actions'];
  votes: VoteInfo;
  replySummary: ReplySummary;
  currentVote: Vote | null;
  pathname?: string;
};

export function CardFooter({
  targetId,
  targetContract,
  actions,
  votes,
  replySummary,
  currentVote,
  pathname,
}: Props) {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isCommentDrawerVisible, setIsCommentDrawerVisible] = useState(false);

  const newActions: ActionProps['actions'] = {
    ...actions,
    comment: actions
      ? actions.comment
      : {
          onComment: () => {
            setIsCommentsOpen(!isCommentsOpen);
          },
          replySummary,
          isReply: false,
        },
  };

  const renderCommentDrawer =
    !newActions.comment?.isReply && (isCommentsOpen || isCommentDrawerVisible);

  return (
    <Flex vertical>
      <Flex justify="space-between" align="left" gap={1} vertical>
        <ActivityActions
          size={FeedActionSizes.SMALL}
          targetId={targetId}
          targetContract={targetContract}
          actions={newActions}
          votes={votes}
          currentVote={currentVote}
          pathname={pathname}
        />
      </Flex>
      {renderCommentDrawer && (
        <CommentsDrawer
          target={{ contract: targetContract, id: targetId }}
          isOpen={isCommentsOpen}
          afterOpen={() => {
            setIsCommentDrawerVisible(true);
          }}
          afterClose={() => {
            setIsCommentDrawerVisible(false);
          }}
          close={() => {
            setIsCommentsOpen(false);
          }}
          commentCount={replySummary.count}
        />
      )}
    </Flex>
  );
}
