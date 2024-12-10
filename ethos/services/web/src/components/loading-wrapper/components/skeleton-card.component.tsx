import { css, type SerializedStyles } from '@emotion/react';
import { Skeleton, Col, Row, theme, Flex } from 'antd';
import { tokenCssVars } from 'config/theme';

export function SkeletonCard({
  rows = 2,
  wrapperCSS,
}: {
  rows?: number;
  wrapperCSS?: SerializedStyles;
}) {
  const { token } = theme.useToken();

  return (
    <Flex
      css={css`
        padding: ${token.padding}px;
        border-width: 0 0 1px 0;
        background-color: ${tokenCssVars.colorBgContainer};
        border-radius: ${token.borderRadius}px;
        ${wrapperCSS}
      `}
      align="stretch"
      vertical
    >
      <Skeleton avatar={{ size: 'large' }} title active paragraph={{ rows }} />
    </Flex>
  );
}

export function SkeletonCardList() {
  return (
    <Flex vertical gap={24}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </Flex>
  );
}

export function TwoColumnSkeletonCardList() {
  return (
    <Row gutter={[24, 24]}>
      <Col xs={{ span: 24 }} lg={{ span: 12 }}>
        <SkeletonCard />
      </Col>
      <Col xs={{ span: 24 }} lg={{ span: 12 }}>
        <SkeletonCard />
      </Col>
    </Row>
  );
}

export function ThreeColumnSkeletonCardList() {
  return (
    <Row gutter={[24, 24]}>
      <Col xs={{ span: 24 }} lg={{ span: 8 }}>
        <SkeletonCard rows={3} />
      </Col>
      <Col xs={{ span: 24 }} lg={{ span: 8 }}>
        <SkeletonCard rows={3} />
      </Col>
      <Col xs={{ span: 24 }} lg={{ span: 8 }}>
        <SkeletonCard rows={3} />
      </Col>
    </Row>
  );
}
