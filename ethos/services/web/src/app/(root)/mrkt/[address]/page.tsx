'use client';

import { css } from '@emotion/react';
import { Col, Row, Typography } from 'antd';
import { type Address } from 'viem';
import { ProfileCard } from '../../profile/_components/profile-card/profile-card.component';
import { MarketActions } from './_components/market-actions.component';
import { MarketHistory } from './_components/market-history.component';
import { MarketInfo } from './_components/market-info.component';
import { MarketLedger } from './_components/market-ledger.component';
import { FeatureGatedPage } from 'components/feature-gate/feature-gate-route';
import { useMarketInfo } from 'hooks/market/market.hooks';
import { useProfile, useTwitterProfile } from 'hooks/user/lookup';

const titleStyles = css`
  padding-top: 12px;
  padding-bottom: 12px;
`;

type Props = {
  params: { address: Address };
};

export default function MarketPage({ params }: Props) {
  const { data: targetProfile } = useProfile({ address: params.address });
  const { data: twitterProfile } = useTwitterProfile({ address: params.address });
  const {
    data: market,
    isPending: isMarketInfoPending,
    refetch: refetchMarket,
  } = useMarketInfo(targetProfile?.id);

  return (
    <FeatureGatedPage featureGate="isReputationMarketEnabled">
      <Row gutter={[24, 32]}>
        <Col span={24}>
          <Typography.Title css={titleStyles} level={2}>
            Reputation market
          </Typography.Title>
        </Col>
      </Row>
      <Row gutter={[23, 32]}>
        <Col xs={24} md={24} lg={12}>
          <ProfileCard
            target={{ address: params.address }}
            twitterProfile={twitterProfile ?? undefined}
          />
        </Col>
        <Col xs={24} md={12} lg={6}>
          <MarketInfo market={market} isLoading={isMarketInfoPending} profile={targetProfile} />
        </Col>
        <Col xs={24} md={12} lg={6}>
          <MarketActions
            market={market}
            isLoading={isMarketInfoPending}
            onActionTaken={() => {
              // Hack: Delay a little before refetching to give event processing a chance.
              setTimeout(() => {
                refetchMarket();
              }, 2000);
            }}
          />
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <Typography.Title css={titleStyles} level={3}>
            Market History
          </Typography.Title>
        </Col>
      </Row>
      <Row gutter={[24, 32]}>
        <Col span={24}>
          <MarketHistory market={market} />
        </Col>
      </Row>
      <Row gutter={[24, 32]}>
        <Col span={24}>
          <Typography.Title css={titleStyles} level={3} />
          <MarketLedger market={market} />
        </Col>
      </Row>
    </FeatureGatedPage>
  );
}
