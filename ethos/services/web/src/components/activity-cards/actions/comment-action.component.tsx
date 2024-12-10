import { css } from '@emotion/react';
import { type ReplySummary } from '@ethos/domain';
import { formatNumber, pluralize } from '@ethos/helpers';
import { Button, Typography, Tooltip } from 'antd';
import { Comment, Expand } from '../../icons';
import { type StyleProps } from './actions.type';
import { tokenCssVars } from 'config/theme';

const { Text } = Typography;

type CommentActionProps = {
  onComment: () => void;
  replySummary: ReplySummary;
  isReply: boolean;
} & StyleProps;

export function CommentAction({
  onComment,
  replySummary,
  isReply,
  buttonStyle,
  iconStyle,
}: CommentActionProps) {
  const colorStyle = css`
    color: ${replySummary.participated
      ? tokenCssVars.colorPrimary
      : tokenCssVars.colorTextTertiary};
  `;

  const iconStyleWithColor = [iconStyle, colorStyle];

  return (
    <Tooltip title="Comments">
      <Button
        onClick={onComment}
        css={buttonStyle}
        disabled={isReply && replySummary.count === 0}
        icon={isReply ? <Expand css={iconStyleWithColor} /> : <Comment css={iconStyleWithColor} />}
      >
        <Text css={colorStyle}>
          {formatNumber(replySummary.count, { maximumFractionDigits: 1 })}{' '}
          {isReply && pluralize(replySummary.count, 'reply', 'replies')}
        </Text>
      </Button>
    </Tooltip>
  );
}
