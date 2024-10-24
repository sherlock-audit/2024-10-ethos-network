import { css } from '@emotion/react';
import { Button, type ButtonProps, Flex, Typography } from 'antd';
import { EthosStar } from 'components/icons';
import { tokenCssVars } from 'config';

export function ContributorCTA({ onClick }: ButtonProps) {
  return (
    <Button
      type="primary"
      css={css`
        padding: 17px 45px;
        border-radius: 6px;
        height: auto;
        width: 100%;
        color: ${tokenCssVars.colorBgContainer};
      `}
      onClick={onClick}
    >
      <Flex vertical align="center" gap={8}>
        <EthosStar css={{ fontSize: 30 }} />
        <Flex vertical align="center">
          <Typography.Title level={3} css={{ color: 'inherit' }}>
            Contributor mode
          </Typography.Title>
          <Typography.Text css={{ color: 'inherit' }}>Start contributing to earn!</Typography.Text>
        </Flex>
      </Flex>
    </Button>
  );
}
