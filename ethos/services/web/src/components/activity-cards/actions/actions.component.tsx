import { ShareAltOutlined } from '@ant-design/icons';
import { type Vote } from '@ethos/blockchain-manager';
import { type TargetContract } from '@ethos/contracts';
import { type VoteInfo } from '@ethos/domain';
import { Button, Flex, Tooltip } from 'antd';
import { Children, Fragment } from 'react';
import { type Entries } from 'type-fest';
import { getStylesBySize } from './actions.helper';
import { type FeedActionSizes, type StyleProps } from './actions.type';
import { AddReplyAction } from './add-reply-action.component';
import { CommentAction } from './comment-action.component';
import { Votes } from './vote.component';
import { tokenCssVars } from 'config';
import { useCopyToClipboard } from 'utils/clipboard';

export type ActionProps = {
  size: FeedActionSizes;
  targetId: number;
  targetContract: TargetContract;
  actions: ActionPropsLookup;
  votes: VoteInfo;
  currentVote: Vote | null;
  pathname?: string;
};

export function ActivityActions({
  size,
  targetId,
  targetContract,
  actions,
  votes,
  currentVote,
  pathname,
}: ActionProps) {
  const copyToClipboard = useCopyToClipboard();

  const { buttonStyle, iconStyle } = getStylesBySize(
    size,
    tokenCssVars.colorBorderSecondary,
    'none',
    tokenCssVars.colorTextTertiary,
  );

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

  const copyShareUrl = async () => {
    if (!pathname) {
      return;
    }

    const link = new URL(pathname, window.location.origin).toString();

    await copyToClipboard(link, 'Link successfully copied');
  };

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
