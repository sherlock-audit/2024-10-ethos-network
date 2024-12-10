'use client';
import { css } from '@emotion/react';
import { type EthosUserTarget } from '@ethos/domain';
import { scoreRanges } from '@ethos/score';
import { ResponsiveLine } from '@nivo/line';
import { theme, Typography } from 'antd';
import { useMemo } from 'react';
import { Logo } from 'components/icons';
import { useScoreHistory } from 'hooks/user/lookup';

const { useToken } = theme;

export function ScoreTrendChart({ target }: { target: EthosUserTarget }) {
  const { token } = useToken();
  const { data: scoreHistory } = useScoreHistory(target);

  const min = scoreRanges.untrusted.min;
  const max = scoreRanges.exemplary.max;
  const step = 200;
  const gridYValues = Array.from({ length: (max - min) / step + 1 }, (_, i) =>
    (min + i * step).toString(),
  );

  const lineData = useMemo(() => {
    if (!scoreHistory) return [];

    // Reverse the array to get chronological order
    const chronologicalData = [...scoreHistory.values].reverse();
    // Transform sampled data into chart format
    const chartData = chronologicalData.map((item) => ({
      x: new Date(item.createdAt).toISOString(),
      y: item.score,
    }));

    return [
      {
        id: 'score',
        data: chartData,
      },
    ];
  }, [scoreHistory]);

  if (!scoreHistory) {
    return null;
  }

  return (
    <ResponsiveLine
      data={lineData}
      margin={{ top: 5, right: 10, bottom: 30, left: 45 }}
      xScale={{ type: 'point' }}
      yScale={{
        type: 'linear',
        min: 'auto',
        max: 'auto',
        stacked: true,
        reverse: false,
      }}
      curve="basis"
      areaBaselineValue={Math.min(...(lineData[0]?.data.map((d) => d.y) ?? [0]))}
      areaOpacity={1}
      axisTop={null}
      axisRight={null}
      colors={['#656ECF']}
      gridYValues={gridYValues}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        truncateTickAt: 0,
        // Remove tickColor and textColor
        format: (value: string | number | Date) => {
          const date = new Date(value);

          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
        },
        tickValues: (() => {
          const data = lineData[0]?.data || [];
          const totalPoints = data.length;
          const interval = Math.max(1, Math.floor(totalPoints / 6));

          return data.filter((_, i) => i % interval === 0).map((d) => d.x);
        })(),
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        truncateTickAt: 0,
        // Remove tickColor and textColor
      }}
      enableGridX={false}
      enablePoints={false}
      enableArea={true}
      enableTouchCrosshair={true}
      useMesh={true}
      tooltip={({ point }) => {
        const date = new Date(point.data.x);
        const formattedDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
        });

        return (
          <div
            css={{
              background: token.colorBgContainer,
              padding: '8px 12px',
              border: `1px solid ${token.colorBorderBg}`,
              borderRadius: token.borderRadius,
            }}
          >
            <Typography.Text strong css={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {point.data.y.toString()}
              <Logo
                css={css`
                  font-size: 10px;
                  position: relative;
                  margin-left: 2px;
                  top: -1px;
                `}
              />
            </Typography.Text>
            <Typography.Text type="secondary">{formattedDate}</Typography.Text>
          </div>
        );
      }}
      theme={{
        axis: {
          ticks: {
            line: {
              stroke: token.colorText,
            },
            text: {
              fill: token.colorText,
            },
          },
        },
        grid: {
          line: {
            stroke: token.colorTextQuaternary,
          },
        },
      }}
    />
  );
}
