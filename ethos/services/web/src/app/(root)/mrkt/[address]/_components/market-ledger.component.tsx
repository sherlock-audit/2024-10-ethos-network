import { Col, Row } from 'antd';
import { MarketActivityList } from './market-activity.component';
import { MarketHolderLists } from './market-holders.components';
import { type echoApi } from 'services/echo';

type Props = {
  market?: Awaited<ReturnType<typeof echoApi.markets.info>>;
};

export function MarketLedger({ market }: Props) {
  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} sm={24} md={16} lg={12}>
        <MarketActivityList market={market} />
      </Col>
      <Col xs={24} sm={24} md={8} lg={12}>
        <MarketHolderLists market={market} />
      </Col>
    </Row>
  );
}
