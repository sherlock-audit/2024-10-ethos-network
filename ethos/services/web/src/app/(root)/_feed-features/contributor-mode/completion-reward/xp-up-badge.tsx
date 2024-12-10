import { css } from '@emotion/react';
import { Flex, Typography } from 'antd';
import { ArrowUpScoreIcon, EthosStar } from 'components/icons';
import { tokenCssVars } from 'config/theme';

export function XpUpBadge({ xpUp }: { xpUp: number }) {
  return (
    <Flex
      gap={3}
      align="center"
      css={css`
        background-color: ${tokenCssVars.colorBgBase};
        padding: 6px 10px;
        border-radius: 4px;
        color: ${tokenCssVars.colorBgContainer};
      `}
    >
      <Typography.Text
        css={{
          fontSize: 20,
          color: tokenCssVars.colorText,
        }}
      >
        {/* We don't format this value because we want it to look sufficiently big for users and
        don't need it to be condensed here */}
        <ArrowUpScoreIcon />
        {xpUp.toFixed(0)}
      </Typography.Text>
      <EthosStar
        css={css`
          font-size: 18px;
          color: ${tokenCssVars.colorText};
        `}
      />
    </Flex>
  );
}
