import { formatEth } from '@ethos/helpers';
import { Tooltip } from 'antd';
import { useWeiToUSD } from 'hooks/api/eth-to-usd-rate.hook';
import { type useAllMarkets } from 'hooks/market/market.hooks';

type MarketData = NonNullable<ReturnType<typeof useAllMarkets>['data']>[number];

export function MarketCapLabel({ marketCap }: { marketCap: MarketData['marketCap'] }) {
  const marketCapWei = marketCap.trust + marketCap.distrust;
  const marketCapUsd = useWeiToUSD(marketCapWei);

  return <Tooltip title={formatEth(marketCapWei, 'wei')}>{marketCapUsd}</Tooltip>;
}
