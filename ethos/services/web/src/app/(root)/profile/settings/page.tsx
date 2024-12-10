'use client';

import { Col, Row, Tabs, type TabsProps } from 'antd';
import { useSearchParams, useRouter } from 'next/navigation';
import { Attestations } from './_components/attestations.component';
import { Notifications } from './_components/notifications.component';
import { Wallets } from './_components/wallets.component';
import { AuthRequiredWrapper } from 'components/auth/auth-required-wrapper.component';
import { BasicPageWrapper } from 'components/basic-page-wrapper/basic-page-wrapper.component';
import { useCurrentUser } from 'contexts/current-user.context';

export default function ProfileSettings() {
  return (
    <BasicPageWrapper title="Settings">
      <Content />
    </BasicPageWrapper>
  );
}

function Content() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') ?? 'wallets';
  const { connectedProfile } = useCurrentUser();
  const router = useRouter();

  const items: TabsProps['items'] = [
    {
      key: 'wallets',
      label: 'Wallets',
      children: (
        <Row>
          <Col span={24}>
            <Wallets />
          </Col>
        </Row>
      ),
    },
    {
      key: 'social',
      label: 'Social connections',
      children: (
        <Row>
          <Col span={24}>
            {connectedProfile && <Attestations profileId={connectedProfile.id} />}
          </Col>
        </Row>
      ),
    },

    {
      key: 'notifications',
      label: 'Notifications',
      children: (
        <Row>
          <Col xs={24} sm={20} md={16} lg={12} xl={12}>
            <Notifications />
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <AuthRequiredWrapper>
      <Tabs
        items={items}
        activeKey={defaultTab}
        destroyInactiveTabPane
        onChange={(key) => {
          router.push(`/profile/settings?tab=${key}`);
        }}
      />
    </AuthRequiredWrapper>
  );
}
