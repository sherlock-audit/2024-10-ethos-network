import { css } from '@emotion/react';
import { reviewContractName, type TargetContract } from '@ethos/contracts';
import { type EthosUserTarget } from '@ethos/domain';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Button, Flex, Select, theme, Typography } from 'antd';
import { useState } from 'react';
import { zeroAddress } from 'viem';
import { type CommentTarget } from 'components/activity-cards/comments/comment.types';
import { Comments } from 'components/activity-cards/comments/comments.component';
import { Reply } from 'components/activity-cards/comments/reply.component';
import { tokenCssVars } from 'config/theme';
import { useCurrentUser } from 'contexts/current-user.context';

type Props = {
  id: number;
  commentCount?: number;
  activityContract: TargetContract;
  hideCloseButton?: boolean;
};

export function ActivityComments({ id, activityContract, commentCount, hideCloseButton }: Props) {
  const { token } = theme.useToken();

  const { connectedAddress } = useCurrentUser();
  const { openConnectModal } = useConnectModal();

  const [replyArgs, setReplyArgs] = useState<[CommentTarget, EthosUserTarget | undefined]>([
    { contract: activityContract, id },
    undefined,
  ]);

  return (
    <Flex
      vertical
      css={css`
        overflow-y: auto;
        height: 100%;
        background: ${tokenCssVars.colorBgContainer};
        border-radius: 6px;
        padding: 18px;
      `}
    >
      <Flex
        align="center"
        justify="space-between"
        css={css`
          padding-bottom: ${token.padding}px;
          border-bottom: 1px solid rgba(31, 33, 38, 0.06); // Todo: need to define a color for this since we use it in multipel places
          margin-bottom: ${token.paddingLG}px;
        `}
      >
        <Typography.Text
          strong
          css={css`
            font-size: 16px;
          `}
        >
          Comments {commentCount ? `(${commentCount})` : ''}
        </Typography.Text>

        <Select
          placeholder="Latest"
          variant="filled"
          disabled
          options={[
            { value: 'latest', label: 'Latest' },
            { value: 'oldest', label: 'Oldest' },
            { value: 'most-popular', label: 'Most popular' },
          ]}
        />
      </Flex>
      <Comments
        target={{ contract: activityContract, id }}
        depth={0}
        onReplyTargetChanged={(target, author) => {
          setReplyArgs([target, author]);
        }}
      />

      <Flex
        vertical
        css={css`
          margin-top: 20px;
        `}
      >
        {connectedAddress ? (
          <Reply
            fromUser={{ address: connectedAddress ?? zeroAddress }}
            replyTarget={replyArgs[0]}
            toUser={replyArgs[1]}
            onRevertTarget={() => {
              setReplyArgs([{ contract: reviewContractName, id }, undefined]);
            }}
            close={close}
            hideCloseButton={hideCloseButton}
            altBg
          />
        ) : (
          <Button
            onClick={openConnectModal}
            type="primary"
            css={css`
              margin-inline: auto;
            `}
          >
            Join the conversation
          </Button>
        )}
      </Flex>
    </Flex>
  );
}
