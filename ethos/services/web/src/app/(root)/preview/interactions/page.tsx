'use client';

import { RecentInteractions } from './_components/recent-interactions.component';
import { BasicPageWrapper } from 'components/basic-page-wrapper/basic-page-wrapper.component';
import { useCurrentUser } from 'contexts/current-user.context';

export default function Page() {
  const { connectedAddress } = useCurrentUser();

  return (
    <BasicPageWrapper title="Your Ethereum Activity">
      <RecentInteractions address={connectedAddress} />
    </BasicPageWrapper>
  );
}
