'use client';

import { css } from '@emotion/react';
import { useParams } from 'next/navigation';
import { type Address } from 'viem';
import { RecentInteractions } from '../_components/recent-interactions.component';
import { useExtractAddress } from 'app/(root)/profile/[address]/use-extract-address';
import { ProfileCard } from 'app/(root)/profile/_components/profile-card/profile-card.component';
import { BasicPageWrapper } from 'components/basic-page-wrapper/basic-page-wrapper.component';

export default function Page() {
  const params = useParams<{ address: Address }>();
  const { address } = useExtractAddress(params.address);

  return (
    <BasicPageWrapper title="Ethereum Activity">
      <div
        css={css`
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 20px;
        `}
      >
        <ProfileCard
          target={{ address }}
          css={css`
            width: 300px;
            max-width: 100%;
          `}
        />
      </div>
      <RecentInteractions address={address} />
    </BasicPageWrapper>
  );
}
