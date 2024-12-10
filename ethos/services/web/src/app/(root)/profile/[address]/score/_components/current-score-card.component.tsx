import { css } from '@emotion/react';
import { convertScoreToLevel } from '@ethos/score';
import { Card, Flex, Typography, theme } from 'antd';
import { ScorePieChart } from './score-pie-chart.component';
import { scoreRangeData } from './score-ranges';
import { Logo } from 'components/icons';
import { getColorFromScoreLevel } from 'utils/score';

const { Title } = Typography;
const { useToken } = theme;

type CurrentScoreCardProps = {
  totalScore: number;
};

export function CurrentScoreCard({ totalScore }: CurrentScoreCardProps) {
  const { token } = useToken();
  const scoreLevel = convertScoreToLevel(totalScore);
  const scoreColor = getColorFromScoreLevel(scoreLevel, token);

  return (
    <Card title={<Title level={3}>Current score</Title>}>
      <div
        css={css`
          height: 200px;
        `}
      >
        <ScorePieChart
          data={scoreRangeData.map((item) => ({ ...item, totalScore }))}
          totalScore={totalScore}
        />
      </div>
      <Flex justify="center" align="center" vertical>
        <Typography.Title
          level={1}
          css={css`
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          `}
        >
          {totalScore.toFixed(0)}
          <Logo
            css={css`
              font-size: 28px;
              color: ${scoreColor};
            `}
          />
        </Typography.Title>
        <Typography.Title level={4}>
          {scoreLevel.charAt(0).toUpperCase() + scoreLevel.slice(1)}
        </Typography.Title>
      </Flex>
    </Card>
  );
}
