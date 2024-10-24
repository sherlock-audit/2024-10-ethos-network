import { css } from '@emotion/react';
import { type EthosUserTarget } from '@ethos/domain';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Button, Drawer, Flex, theme, Typography } from 'antd';
import { useState } from 'react';
import { zeroAddress } from 'viem';
import { type CommentTarget } from './comment.types';
import { Comments, type CommentsProps } from './comments.component';
import { Reply } from './reply.component';
import { tokenCssVars } from 'config';
import { useCurrentUser } from 'contexts/current-user.context';

const { useToken } = theme;

const { Text } = Typography;

type Props = {
  close: () => void;
  afterClose?: () => void;
  afterOpen?: () => void;
  isOpen: boolean;
  commentCount: number;
} & Pick<CommentsProps, 'target'>;

export function CommentsDrawer({
  close,
  isOpen,
  commentCount,
  target,
  afterOpen,
  afterClose,
}: Props) {
  const { token } = useToken();
  const { connectedAddress } = useCurrentUser();
  const { openConnectModal } = useConnectModal();

  const [replyArgs, setReplyArgs] = useState<[CommentTarget, EthosUserTarget | undefined]>([
    target,
    undefined,
  ]);

  return (
    <Drawer
      mask={true}
      styles={{
        header: {
          padding: `${token.padding}px ${token.paddingLG}px`,
          borderBottom: `1px solid ${tokenCssVars.colorBgLayout}`,
        },
        body: { padding: `10px 0 0 0` },
        wrapper: { width: '410px' },
        mask: { background: tokenCssVars.colorBgMask },
      }}
      title={
        <Flex align="center" justify="space-between" gap={12}>
          <Text
            css={css`
              font-size: ${token.fontSizeLG}px;
            `}
          >
            Comments ({commentCount})
          </Text>
        </Flex>
      }
      open={isOpen}
      afterOpenChange={() => {
        if (isOpen && afterOpen) {
          afterOpen();
        } else if (!isOpen && afterClose) {
          afterClose();
        }
      }}
      onClose={close}
    >
      <Flex
        vertical
        justify="space-between"
        css={css`
          height: 100%;
        `}
      >
        <Flex
          css={css`
            overflow-y: auto;
            height: 100%;
            padding: 0 ${token.paddingLG}px;
          `}
        >
          <Comments
            target={target}
            depth={0}
            onReplyTargetChanged={(target, author) => {
              setReplyArgs([target, author]);
            }}
          />
        </Flex>
        <Flex
          vertical
          css={css`
            padding: 25px 25px;
            box-shadow:
              0px 6px 16px 0px rgba(0, 0, 0, 0.08),
              0px 3px 6px -4px rgba(0, 0, 0, 0.12),
              0px 9px 28px 8px rgba(0, 0, 0, 0.05);
          `}
        >
          {connectedAddress ? (
            <Reply
              fromUser={{ address: connectedAddress ?? zeroAddress }}
              replyTarget={replyArgs[0]}
              toUser={replyArgs[1]}
              onRevertTarget={() => {
                setReplyArgs([target, undefined]);
              }}
              close={close}
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
    </Drawer>
  );
}
