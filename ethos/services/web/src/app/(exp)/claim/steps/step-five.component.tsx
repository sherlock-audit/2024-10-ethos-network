import { css } from '@emotion/react';
import { Flex, theme, Typography } from 'antd';
import { ActionButton } from 'app/(exp)/_components/action-button.component';
import { EthosStar } from 'components/icons';
import { tokenCssVars } from 'config/theme';

export function StepFive() {
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
      <EthosStar
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
        We’re rewarding
      </Typography.Title>
      <Typography.Text
        css={css({
          color: tokenCssVars.colorBgElevated,
          textAlign: 'center',
        })}
      >
        People that already
        <br /> have credibility
      </Typography.Text>
      <ActionButton
        type="default"
        css={css({
          color: tokenCssVars.colorPrimary,
        })}
      >
        Connect x.com & claim
      </ActionButton>
    </Flex>
  );
}
