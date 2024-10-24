import { css } from '@emotion/react';
import { Button, Typography } from 'antd';
import { Reply } from '../../icons';
import { type StyleProps } from './actions.type';
import { tokenCssVars } from 'config';

const { Text } = Typography;

type AddReplyActionProps = { onAddReply: () => void } & StyleProps;

export function AddReplyAction({ onAddReply, buttonStyle, iconStyle }: AddReplyActionProps) {
  return (
    <Button onClick={onAddReply} css={buttonStyle} icon={<Reply css={iconStyle} />}>
      <Text
        css={css`
          color: ${tokenCssVars.colorTextTertiary};
        `}
      >
        Reply
      </Text>
    </Button>
  );
}
