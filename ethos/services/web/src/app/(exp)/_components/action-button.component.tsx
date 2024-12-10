import { css } from '@emotion/react';
import { Button, theme } from 'antd';

export type ActionButtonProps = Omit<React.ComponentProps<typeof Button>, 'size'>;

export function ActionButton(props: ActionButtonProps) {
  const { token } = theme.useToken();

  return (
    <Button
      size="large"
      {...props}
      css={[
        css({
          width: '300px',
          maxWidth: '100%',
          padding: token.paddingLG,
        }),
        props.css,
      ]}
    />
  );
}
