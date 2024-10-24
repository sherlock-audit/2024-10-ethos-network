'use client';

import { css } from '@emotion/react';
import { Flex } from 'antd';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';
import { FeatureGatedPage } from 'components/feature-gate/feature-gate-route';
import { LottieLoader } from 'components/loading-wrapper/lottie-loader.component';
import { usePrimaryAddress } from 'hooks/user/lookup';

type Props = {
  params: { profileId: number };
};

/**
 * Convenience page to redirect to the market for the primary address of the profile
 */
export default function MarketProfilePage({ params }: Props) {
  const { data: primaryAddress } = usePrimaryAddress({ profileId: params.profileId });

  useEffect(() => {
    if (primaryAddress) {
      redirect(`/mrkt/${primaryAddress}`);
    }
  }, [primaryAddress]);

  return (
    <FeatureGatedPage featureGate="isReputationMarketEnabled">
      <Flex
        justify="center"
        align="center"
        css={css`
          margin-top: 100px;
        `}
      >
        <LottieLoader size={100} />
      </Flex>
    </FeatureGatedPage>
  );
}
