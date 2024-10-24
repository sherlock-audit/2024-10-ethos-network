import { css } from '@emotion/react';
import { type Vote } from '@ethos/blockchain-manager';
import { type TargetContract } from '@ethos/contracts';
import { type VoteInfo } from '@ethos/domain';
import { formatNumber } from '@ethos/helpers';
import { Button, Flex, Progress, Typography, Tooltip } from 'antd';
import { type StyleProps } from './actions.type';
import { AuthMiddleware } from 'components/auth/auth-middleware';
import { ArrowDown, ArrowUp } from 'components/icons';
import { tokenCssVars } from 'config';
import { useVoteFor } from 'hooks/api/blockchain-manager';

const { Text } = Typography;

type VoteProps = {
  targetId: number;
  targetContract: TargetContract;
  votes: VoteInfo;
  currentVote: Vote | null;
} & StyleProps &
  React.PropsWithChildren;

export function Votes({
  targetId,
  targetContract,
  buttonStyle,
  iconStyle,
  children,
  votes,
  currentVote,
}: VoteProps) {
  const highlightedStyle = css`
    color: ${tokenCssVars.colorPrimary};
  `;
  const unHighlightedStyle = css`
    color: ${tokenCssVars.colorTextTertiary};
  `;

  const { upvoted, downvoted } = currentVote
    ? { upvoted: currentVote.isUpvote, downvoted: !currentVote.isUpvote }
    : { upvoted: false, downvoted: false };

  const upvotes = Number(votes?.upvotes ?? 0);
  const downvotes = Number(votes?.downvotes ?? 0);
  const totalVotes = upvotes + downvotes;
  const votePercent = totalVotes > 0 ? (upvotes / totalVotes) * 100 : 0;

  const voteFor = useVoteFor(targetContract);
  const voteAction = async (toUpvote: boolean) => {
    await voteFor.mutateAsync({ id: targetId, isUpvote: toUpvote });
  };

  return (
    <>
      <Flex align="center">
        <AuthMiddleware>
          <Tooltip title="Upvote">
            <Button
              onClick={async () => {
                await voteAction(true);
              }}
              css={[buttonStyle, `width: 16px; margin-right: 10px;`]}
              icon={<ArrowUp css={[iconStyle, upvoted && highlightedStyle]} />}
            />
          </Tooltip>
        </AuthMiddleware>

        <Text css={upvoted || downvoted ? highlightedStyle : unHighlightedStyle}>
          {formatNumber(upvotes - downvotes, { maximumFractionDigits: 1 })}
        </Text>
        <AuthMiddleware>
          <Tooltip title="Downvote">
            <Button
              onClick={async () => {
                await voteAction(false);
              }}
              css={buttonStyle}
              icon={<ArrowDown css={[iconStyle, downvoted && highlightedStyle]} />}
            />
          </Tooltip>
        </AuthMiddleware>
      </Flex>
      {children}
      <Tooltip
        overlayStyle={{ whiteSpace: 'pre-line' }}
        title={[
          `${votePercent}% of people upvoted this review`,
          `${upvotes} Upvotes · ${downvotes} Downvotes`,
        ].join('\n')}
      >
        <Progress
          showInfo={false}
          size={18}
          type="circle"
          strokeColor={tokenCssVars.colorTextSecondary}
          percent={(upvotes / (upvotes + downvotes)) * 100}
          css={css`
            margin-left: auto;
          `}
        />
      </Tooltip>
    </>
  );
}
