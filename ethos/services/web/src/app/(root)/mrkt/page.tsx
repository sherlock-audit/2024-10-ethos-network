'use client';

import { BasicPageWrapper } from '../../../components/basic-page-wrapper/basic-page-wrapper.component';
import { FeatureGatedPage } from '../../../components/feature-gate/feature-gate-route';
import { MarketsList } from './[address]/markets-list.component';

export default function Page() {
  return (
    <FeatureGatedPage featureGate="isReputationMarketEnabled">
      <BasicPageWrapper title="Reputation Markets">
        <MarketsList />
      </BasicPageWrapper>
    </FeatureGatedPage>
  );
}
