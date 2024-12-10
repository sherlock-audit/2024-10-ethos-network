import { Row, Typography, Col, Flex, Card } from 'antd';
import { MarketHistory } from './market-history.component.tsx';
import { ThumbsDownFilledIcon, ThumbsUpFilledIcon } from '~/components/icons/thumbs.tsx';
import { type MarketPriceHistory } from '~/types/charts.ts';
import { type MarketWithStats } from '~/types/markets.ts';

export function MarketInfo({
  market,
  priceHistoryPromise,
}: {
  market: MarketWithStats;
  priceHistoryPromise: Promise<MarketPriceHistory>;
}) {
  return (
    <Row
      gutter={[
        { xs: 16, sm: 16, md: 24 },
        { xs: 16, sm: 16, md: 24 },
      ]}
    >
      <Col span={24} className="mb-4">
        <Row>
          <Col span={24}>
            <Card
              classNames={{
                body: 'px-0',
              }}
            >
              <Flex className="flex items-center justify-between pb-4 px-6 border-b border-b-borderDark">
                <Typography.Title className="text-trust">
                  <ThumbsUpFilledIcon className="text-2xl" />{' '}
                  <span className="text-antd-colorTextBase">
                    {market.stats.trustPercentage.toFixed(0)}%{' '}
                  </span>
                  <span>Trust</span>
                </Typography.Title>
                <Typography.Title className="text-distrust">
                  <ThumbsDownFilledIcon className="text-2xl" />{' '}
                  <span className="text-antd-colorTextBase">
                    {(100 - market.stats.trustPercentage).toFixed(0)}%{' '}
                  </span>
                  <span>Distrust</span>
                </Typography.Title>
              </Flex>
              <MarketHistory priceHistoryPromise={priceHistoryPromise} />
            </Card>
          </Col>
        </Row>
      </Col>
    </Row>
  );
}
