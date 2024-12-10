import { css } from '@emotion/react';
import { Button } from 'antd';
import { DiscordIcon } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { ethosDiscordLink } from 'constant/links';

export function JoinDiscordCta() {
  return (
    <Button
      href={ethosDiscordLink}
      icon={<DiscordIcon />}
      target="_blank"
      type="primary"
      size="large"
      css={css`
        color: ${tokenCssVars.colorPrimary};
        background-color: ${tokenCssVars.colorBgContainer};

        &:hover {
          color: ${tokenCssVars.colorPrimaryHover};
          background-color: ${tokenCssVars.colorBgElevated};
      `}
    >
      Join our Discord
    </Button>
  );
}
