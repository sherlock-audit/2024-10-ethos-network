'use client';
import { Flex } from 'antd';
import { InviteBox } from './_components/invite-box.component';
import { InviteTable } from './_components/invite-table.component';
import { AuthRequiredWrapper } from 'components/auth/auth-required-wrapper.component';
import { BasicPageWrapper } from 'components/basic-page-wrapper/basic-page-wrapper.component';
import { useCurrentUser } from 'contexts/current-user.context';

export default function Page() {
  const { connectedProfile } = useCurrentUser();

  return (
    <BasicPageWrapper title="Invite">
      <AuthRequiredWrapper>
        <Flex vertical gap={20}>
          <InviteBox />
          {connectedProfile && <InviteTable profileId={connectedProfile.id} />}
        </Flex>
      </AuthRequiredWrapper>
    </BasicPageWrapper>
  );
}
