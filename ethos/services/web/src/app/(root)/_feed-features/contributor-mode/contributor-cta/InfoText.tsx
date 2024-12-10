import { css } from '@emotion/react';
import { Typography } from 'antd';
import { type PropsWithChildren } from 'react';
import { tokenCssVars } from 'config/theme';
import { useThemeMode } from 'contexts/theme-manager.context';

export function InfoText({ children }: PropsWithChildren) {
  const mode = useThemeMode();

  return (
    <Typography.Text
      css={css`
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: ${mode === 'light' ? tokenCssVars.orange8 : tokenCssVars.orange6};
        font-size: 12px;
        line-height: 20px;
      `}
    >
      {children}
    </Typography.Text>
  );
}
