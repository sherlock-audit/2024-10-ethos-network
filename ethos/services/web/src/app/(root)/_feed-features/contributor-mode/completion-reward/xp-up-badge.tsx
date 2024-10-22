import { css } from '@emotion/react';
import { Flex, Typography } from 'antd';
import { EthosStar } from 'components/icons';
import { tokenCssVars } from 'config';

export function XpUpBadge({ xpUp }: { xpUp: number }) {
  return (
    <Flex
      gap={3}
      align="center"
      css={css`
        background-color: ${tokenCssVars.colorSuccess};
        padding: 7px 11px;
        border-radius: 0px 0px 8px 8px;
        color: ${tokenCssVars.colorBgContainer};
      `}
    >
      <Typography.Text
        css={{
          fontSize: 23,
          fontWeight: 600,
          color: 'inherit',
        }}
      >
        + {xpUp}
      </Typography.Text>
      <EthosStar css={{ fontSize: 21 }} />
    </Flex>
  );
}
