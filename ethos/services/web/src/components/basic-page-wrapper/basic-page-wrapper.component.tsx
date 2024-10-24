import { css } from '@emotion/react';
import { Col, Flex, Typography } from 'antd';
import { type PropsWithChildren } from 'react';

type Props = PropsWithChildren<{ title: string }>;

export function BasicPageWrapper({ children, title }: Props) {
  return (
    <Col span={24}>
      <Flex
        justify="flex-start"
        css={css`
          padding-top: 18px;
          padding-bottom: 12px;
        `}
      >
        <Typography.Title level={2}>{title}</Typography.Title>
      </Flex>

      {children}
    </Col>
  );
}
