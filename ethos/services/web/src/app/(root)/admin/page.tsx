'use client';
import { css } from '@emotion/react';
import { Card, Flex, Tabs, type TabsProps } from 'antd';
import { AddInvites } from './_components/invites.component';
import { MarketAdmin } from './_components/markets.component';
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
        <Flex justify="center">
          <Card
            css={css`
              max-width: 450px;
              width: 100%;
            `}
          >
            <MarketAdmin />
          </Card>
        </Flex>
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
