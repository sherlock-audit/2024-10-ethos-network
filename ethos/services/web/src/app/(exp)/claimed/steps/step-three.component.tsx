import { css } from '@emotion/react';
import { Flex, theme, Typography } from 'antd';
import { ActionButton } from 'app/(exp)/_components/action-button.component';
import { Logo } from 'components/icons';
import { tokenCssVars } from 'config/theme';

export function StepThree() {
  const { token } = theme.useToken();

  return (
    <Flex
      vertical
      align="center"
      justify="center"
      gap={token.marginMD}
      css={css({
        backgroundColor: tokenCssVars.colorPrimary,
        height: tokenCssVars.fullHeight,
        padding: `${token.padding}px`,
      })}
    >
      <Logo
        css={css`
          color: ${tokenCssVars.colorBgElevated};
          font-size: 40px;
        `}
      />
      <Typography.Title
        level={3}
        css={css({
          color: tokenCssVars.colorBgElevated,
          textAlign: 'center',
        })}
      >
        Want to earn more?
      </Typography.Title>
      <Typography.Text
        css={css({
          color: tokenCssVars.colorBgElevated,
          textAlign: 'center',
        })}
      >
        XP will play a key role for Ethos in how credibility is determined in crypto
      </Typography.Text>
      <ActionButton
        css={css({
          color: tokenCssVars.colorPrimary,
        })}
      >
        See your profile
      </ActionButton>
    </Flex>
  );
}
