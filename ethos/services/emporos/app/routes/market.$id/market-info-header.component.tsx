import { formatCurrency } from '@ethos/helpers';
import { Flex, Typography, Col, Row } from 'antd';
import { MarketAvatar } from '~/components/avatar/market-avatar.component.tsx';
import { BarChartIcon } from '~/components/icons/bar-chart.tsx';
import { CalendarMonthIcon } from '~/components/icons/calendar-month.tsx';
import { RelativeDateTime } from '~/components/relative-time.component.tsx';
import { type MarketWithStats } from '~/types/markets.ts';

export function MarketInfoHeader({ market }: { market: MarketWithStats }) {
  return (
    <Row
      gutter={[
        { xs: 16, sm: 16, md: 24 },
        { xs: 16, sm: 16, md: 24 },
      ]}
    >
      <Col span={24}>
        <Flex align="center" gap={12}>
          <MarketAvatar size="small" avatarUrl={market.avatarUrl} />

          <Flex vertical className="gap-y-1 gap-x-3 min-w-0 flex-1">
            <Typography.Title
              level={1}
              ellipsis
              className="whitespace-nowrap text-2xl lg:text-3xl m-0 w-full"
            >
              Do you trust {market.name}?
            </Typography.Title>
            <Flex gap={12}>
              <Flex gap={4} align="center">
                <BarChartIcon className="opacity-65 text-antd-colorTextSecondary" />
                <Typography.Text type="secondary" className="text-xs whitespace-nowrap">
                  {formatCurrency(market.stats.totalVolumeUsd, 'USD')} total volume
                </Typography.Text>
              </Flex>
              <Flex gap={4} align="center">
                <CalendarMonthIcon className="opacity-65 text-antd-colorTextSecondary" />
                <Typography.Text type="secondary" className="text-xs whitespace-nowrap">
                  <RelativeDateTime timestamp={market.createdAt} verbose />
                </Typography.Text>
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </Col>
    </Row>
  );
}
