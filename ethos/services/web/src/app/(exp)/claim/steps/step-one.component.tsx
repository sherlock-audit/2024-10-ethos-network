import { css } from '@emotion/react';
import { Flex, theme, Typography } from 'antd';
import { CentredBackgroundImage } from '../../_components/centred-background-image.component';
import { tokenCssVars } from 'config/theme';

export function StepOne() {
  const { token } = theme.useToken();

  return (
    <Flex
      justify="center"
      align="center"
      css={css({
        height: tokenCssVars.fullHeight,
        position: 'relative',
        padding: '50px 0',
        backgroundColor: tokenCssVars.colorPrimary,
        color: token.colorWhite,
        overflow: 'hidden',
      })}
    >
      <CentredBackgroundImage image="/assets/images/logo.svg" imageSize="70%" opacity={0.2} />
      <Typography.Title
        level={1}
        css={css({
          textAlign: 'center',
          color: tokenCssVars.colorBgElevated,
          zIndex: 1, // Ensure text is above the background
        })}
      >
        gm.
        <br />
        we’re ethos.
      </Typography.Title>
    </Flex>
  );
}
