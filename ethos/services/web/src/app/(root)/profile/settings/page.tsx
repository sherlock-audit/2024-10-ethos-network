'use client';

import { Col, Row } from 'antd';
import { Attestations } from './_components/attestations.component';
import { Wallets } from './_components/wallets.component';
import { AuthRequiredWrapper } from 'components/auth/auth-required-wrapper.component';
import { BasicPageWrapper } from 'components/basic-page-wrapper/basic-page-wrapper.component';
import { useCurrentUser } from 'contexts/current-user.context';

export default function ProfileSettings() {
  return (
    <BasicPageWrapper title="Profile Settings">
      <Content />
    </BasicPageWrapper>
  );
}

function Content() {
  const { connectedProfile } = useCurrentUser();

  return (
    <AuthRequiredWrapper>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          {connectedProfile && <Attestations profileId={connectedProfile.id} />}
        </Col>
        <Col xs={24} md={12}>
          <Wallets />
        </Col>
      </Row>
    </AuthRequiredWrapper>
  );
}
