import { css } from '@emotion/react';
import { Col, Flex, Row, theme } from 'antd';
import { type ReactNode } from 'react';

export function TwoColumns({
  columnOne,
  columnTwo,
  full,
}: {
  columnOne: ReactNode;
  columnTwo: ReactNode;
  full: ReactNode;
}) {
  const { token } = theme.useToken();

  return (
    <Row gutter={[24, 24]}>
      <Col
        css={css`
          display: none;
          @media (min-width: ${token.screenLG}px) {
            display: block;
          }
        `}
        xs={{ span: 24 }}
        lg={{ span: 12 }}
      >
        <Flex gap={24} vertical>
          {columnOne}
        </Flex>
      </Col>

      <Col
        css={css`
          display: none;
          @media (min-width: ${token.screenLG}px) {
            display: block;
          }
        `}
        xs={{ span: 24 }}
        lg={{ span: 12 }}
      >
        <Flex gap={24} vertical>
          {columnTwo}
        </Flex>
      </Col>

      <Col
        css={css`
          display: block;
          @media (min-width: ${token.screenLG}px) {
            display: none;
          }
        `}
        xs={{ span: 24 }}
        lg={{ span: 12 }}
      >
        <Flex gap={24} vertical>
          {full}
        </Flex>
      </Col>
    </Row>
  );
}
