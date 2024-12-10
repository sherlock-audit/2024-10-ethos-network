import { css } from '@emotion/react';
import { type EthosUserTarget } from '@ethos/domain';
import { Card, Typography } from 'antd';
import { ScoreTrendChart } from './score-trend-chart.component';

const { Title } = Typography;

type TrendCardProps = {
  target: EthosUserTarget;
};

export function TrendCard({ target }: TrendCardProps) {
  return (
    <Card title={<Title level={3}>Trend</Title>}>
      <div
        css={css`
          height: 275px;
        `}
      >
        <ScoreTrendChart target={target} />
      </div>
    </Card>
  );
}
