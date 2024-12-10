'use client';
import { css } from '@emotion/react';
import { Card, Col, Flex, Row, Tabs, type TabsProps } from 'antd';
import { AddInvites } from './_components/invites.component';
import { MarketAdminCreate } from './_components/market-create.component';
import { MarketAdmin } from './_components/market-permissions.component';
import { BasicPageWrapper } from 'components/basic-page-wrapper/basic-page-wrapper.component';
import { FeatureGatedPage } from 'components/feature-gate/feature-gate-route';

export default function Page() {
  const items: TabsProps['items'] = [
    {
      key: 'invites',
      label: 'Invites',
      children: (
        <Flex justify="center">
          <Card
            css={css`
              max-width: 450px;
              width: 100%;
            `}
          >
            <AddInvites />
          </Card>
        </Flex>
      ),
    },
    {
      key: 'markets',
      label: 'Markets',
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card>
              <MarketAdminCreate />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card>
              <MarketAdmin />
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <FeatureGatedPage featureGate="isAdminPageEnabled">
      <BasicPageWrapper title="Admin">
        <Tabs items={items} />
      </BasicPageWrapper>
    </FeatureGatedPage>
  );
}
