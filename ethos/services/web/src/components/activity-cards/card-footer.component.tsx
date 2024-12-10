import { type Vote } from '@ethos/blockchain-manager';
import { type TargetContract } from '@ethos/contracts';
import { type ReplySummary, type VoteInfo } from '@ethos/domain';
import { Flex } from 'antd';
import { type ActionProps, ActivityActions } from './actions/actions.component';
import { useCommentsDrawer } from 'contexts/comments-drawer.context';

type Props = {
  targetId: number;
  targetContract: TargetContract;
  actions?: ActionProps['actions'];
  votes: VoteInfo;
  replySummary: ReplySummary;
  currentVote: Vote | null;
  pathname?: string;
  hideComments?: boolean;
};

export function CardFooter({
  targetId,
  targetContract,
  actions,
  votes,
  replySummary,
  currentVote,
  pathname,
  hideComments,
}: Props) {
  const { openDrawer } = useCommentsDrawer();

  const newActions: ActionProps['actions'] = {
    ...actions,
  };

  if (!hideComments) {
    newActions.comment = actions
      ? actions.comment
      : {
          onComment: () => {
            openDrawer(targetId, targetContract, replySummary);
          },
          replySummary,
          isReply: false,
        };
  }

  return (
    <Flex vertical>
      <Flex justify="space-between" align="left" gap={1} vertical>
        <ActivityActions
          targetId={targetId}
          targetContract={targetContract}
          actions={newActions}
          votes={votes}
          currentVote={currentVote}
          pathname={pathname}
        />
      </Flex>
    </Flex>
  );
}
