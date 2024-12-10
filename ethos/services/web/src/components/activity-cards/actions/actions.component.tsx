import { ShareAltOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { type Vote } from '@ethos/blockchain-manager';
import { useCopyToClipboard } from '@ethos/common-ui';
import { type TargetContract } from '@ethos/contracts';
import { type VoteInfo } from '@ethos/domain';
import { Button, Flex, Tooltip } from 'antd';
import { Children, Fragment } from 'react';
import { type Entries } from 'type-fest';
import { type StyleProps } from './actions.type';
import { AddReplyAction } from './add-reply-action.component';
import { CommentAction } from './comment-action.component';
import { Votes } from './vote.component';
import { tokenCssVars } from 'config/theme';

export type ActionProps = {
  targetId: number;
  targetContract: TargetContract;
  actions: ActionPropsLookup;
  votes: VoteInfo;
  currentVote: Vote | null;
  pathname?: string;
};

const buttonStyle = css({
  borderRadius: '40px',
  border: `1px solid ${tokenCssVars.colorBorderSecondary}`,
  padding: 0,
  background: 'none',
});

const iconStyle = css({
  color: tokenCssVars.colorTextTertiary,
});

export function ActivityActions({
  targetId,
  targetContract,
  actions,
  votes,
  currentVote,
  pathname,
}: ActionProps) {
  const copyToClipboard = useCopyToClipboard();

  const entries = Object.entries(actions) as Entries<typeof actions>;
  const components = entries
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      ACTION_COMPONENT_LOOKUP[key]({
        ...(value as any),
        buttonStyle,
        iconStyle,
      }),
    );

  async function copyShareUrl() {
    if (!pathname) {
      return;
    }

    const link = new URL(pathname, window.location.origin).toString();

    await copyToClipboard(link, 'Link successfully copied');
  }

  return (
    <Flex gap={12} align="center" flex={1}>
      <Votes
        targetId={targetId}
        targetContract={targetContract}
        buttonStyle={buttonStyle}
        iconStyle={iconStyle}
        votes={votes}
        currentVote={currentVote}
      >
        {Children.map(components, (component, index) => (
          <Fragment key={`action-${index}`}>{component}</Fragment>
        ))}
        {pathname && (
          <Tooltip title="Share">
            <Button
              onClick={copyShareUrl}
              css={[
                buttonStyle,
                `
                  width: 18px;
                `,
              ]}
              icon={<ShareAltOutlined css={[iconStyle]} />}
            />
          </Tooltip>
        )}
      </Votes>
    </Flex>
  );
}

const ACTION_COMPONENT_LOOKUP = {
  comment: CommentAction,
  addReply: AddReplyAction,
};

type ActionComponentLookup = typeof ACTION_COMPONENT_LOOKUP;
type ActionPropsLookup = {
  [Property in keyof ActionComponentLookup]?: Omit<
    Parameters<ActionComponentLookup[Property]>[0],
    keyof StyleProps
  >;
};
