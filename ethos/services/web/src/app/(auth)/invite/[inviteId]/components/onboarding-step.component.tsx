import { css } from '@emotion/react';
import { Flex, theme, Typography } from 'antd';
import { type PropsWithChildren, type ReactNode } from 'react';
import { tokenCssVars } from '../../../../../config';
import { Logo } from 'components/icons';

export function OnboardingStep({
  icon,
  title,
  description,
  children,
}: PropsWithChildren<{
  icon?: ReactNode;
  title: ReactNode;
  description: ReactNode;
}>) {
  const { token } = theme.useToken();

  return (
    <div
      css={css`
        display: flex;
        justify-content: center;
        height: 100vh;
        overflow: hidden;
      `}
    >
      <Flex
        vertical
        gap={25}
        align="center"
        justify="center"
        css={css`
          text-align: center;
          position: relative;
        `}
      >
        <div
          css={css`
            position: relative; // Changed from absolute to relative
            margin-bottom: -40px; // Add negative margin to overlap with title
            margin-left: -25px;
            z-index: 0;
          `}
        >
          {icon ?? (
            <Logo
              css={css`
                font-size: 200px;
                color: ${tokenCssVars.colorText};
              `}
            />
          )}
        </div>
        <Typography.Title
          css={css`
            font-size: 96px;
            line-height: 78px;
            position: relative;
            z-index: 1;

            @media (max-width: ${token.screenSM}px) {
              font-size: 80px;
            }
          `}
        >
          {title}
        </Typography.Title>
        <Typography.Text
          css={css`
            font-size: 14px;
            line-height: 22px;
            text-align: center;
          `}
        >
          {description}
        </Typography.Text>
        {children}
      </Flex>
    </div>
  );
}
