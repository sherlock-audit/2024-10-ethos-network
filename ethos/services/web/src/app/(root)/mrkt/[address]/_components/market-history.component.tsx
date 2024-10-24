import { getUnixTimestamp } from '@ethos/helpers';
import { Card, Col, Flex, Row, Segmented, Typography } from 'antd';
import { type UTCTimestamp } from 'lightweight-charts';
import { useMemo, useState } from 'react';
import { formatEther } from 'viem';
import {
  type ChartWindow,
  chartWindowOptions,
  PriceHistoryChart,
  type PriceType,
  priceTypeOptions,
} from './price-history-chart.component';
import { useMarketPriceHistory } from 'hooks/market/market.hooks';
import { type echoApi } from 'services/echo';

type Props = {
  market?: Awaited<ReturnType<typeof echoApi.markets.info>>;
};

export function MarketHistory({ market }: Props) {
  return (
    <Row>
      <Col span={24}>
        <Card>{market ? <MarketHistoryData market={market} /> : <NoMarketHistory />}</Card>
      </Col>
    </Row>
  );
}

const NoMarketHistory = () => {
  return (
    <Col>
      <Flex justify="center" align="center">
        <Typography.Title level={4}>N/A</Typography.Title>
      </Flex>
    </Col>
  );
};

const MarketHistoryData = ({
  market,
}: {
  market: NonNullable<Awaited<ReturnType<typeof echoApi.markets.info>>>;
}) => {
  const [chartWindow, setChartWindow] = useState<ChartWindow>('7D');
  const [priceType, setPriceType] = useState<PriceType>('trust');

  const { data: priceHistoryData } = useMarketPriceHistory(market.profileId, chartWindow);

  const priceHistoryChartData = useMemo(() => {
    if (!priceHistoryData) return [];

    return priceHistoryData.map((value) => ({
      time: getUnixTimestamp(value.createdAt, 'milliseconds') as UTCTimestamp,
      trust: Number(formatEther(BigInt(value.positivePrice), 'wei')),
      distrust: Number(formatEther(BigInt(value.negativePrice), 'wei')),
    }));
  }, [priceHistoryData]);

  return (
    <Col span={24}>
      <Flex justify="space-between">
        <Segmented<ChartWindow>
          options={[...chartWindowOptions]}
          value={chartWindow}
          // TODO: Support variable window sizes
          // onChange={setChartWindow}
        />
        <Segmented<PriceType>
          options={[...priceTypeOptions]}
          value={priceType}
          onChange={setPriceType}
        />
      </Flex>
      <Segmented<ChartWindow> options={[]} value={chartWindow} onChange={setChartWindow} />
      <PriceHistoryChart
        data={priceHistoryChartData}
        priceType={priceType}
        chartWindow={chartWindow}
      />
    </Col>
  );
};
