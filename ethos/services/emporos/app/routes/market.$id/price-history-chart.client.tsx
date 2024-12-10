import { type CustomLayerProps, ResponsiveLine } from '@nivo/line';
import { type ScaleTime, type ScaleLinear } from '@nivo/scales';
import { theme, Typography } from 'antd';
import clsx from 'clsx';
import { useMemo } from 'react';
import { formatEther } from 'viem';
import { ThumbsDownOutlinedIcon, ThumbsUpOutlinedIcon } from '~/components/icons/thumbs.tsx';
import { tailwindTheme } from '~/theme/tailwindTheme.tsx';
import { type MarketPriceHistory, type ChartWindow } from '~/types/charts.ts';

export type PriceType = 'trust' | 'distrust';
const MAX_VOTE_PRICE = 0.001;

const TIME_WINDOW_FORMATTERS: Record<ChartWindow, (value: Date) => string> = {
  '1D': (value) =>
    new Intl.DateTimeFormat('default', { hour: 'numeric', minute: '2-digit' }).format(value),
  '7D': (value) =>
    new Intl.DateTimeFormat('default', { weekday: 'short', hour: 'numeric' }).format(value),
  '1M': (value) =>
    new Intl.DateTimeFormat('default', { month: 'short', day: '2-digit' }).format(value),
  '1Y': (value) =>
    new Intl.DateTimeFormat('default', { month: 'short', day: 'numeric', year: 'numeric' }).format(
      value,
    ),
};

type LineData = { id: PriceType; data: Array<{ x: Date; y: number }> };

type LineChartProps = {
  data: Array<{ time: Date; trust: number; distrust: number }>;
  chartWindow: ChartWindow;
};

type CustomLineLayerProps = Omit<CustomLayerProps, 'xScale' | 'yScale'> & {
  xScale: ScaleTime<number>;
  yScale: ScaleLinear<string | number | Date>;
};

function votePriceToPercentage(price: number): string {
  if (!price) return '0%';
  const percentage = (price / MAX_VOTE_PRICE) * 100;

  return percentage.toFixed(0) + '%';
}

function useScaleTicks(data: LineChartProps['data']) {
  const { minValue, maxValue, tickValues } = useMemo(() => {
    // Find min and max values from both trust and distrust data
    const allValues = data.flatMap((point) => [point.trust, point.distrust]);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    // Convert to percentages (0.001 = 100%)
    const minPercent = Math.floor((min / MAX_VOTE_PRICE) * 100);
    const maxPercent = Math.ceil((max / MAX_VOTE_PRICE) * 100);

    // Round to nearest 10% and add padding
    const roundedMin = Math.max(0, Math.floor((minPercent - 10) / 10) * 10);
    const roundedMax = Math.min(100, Math.ceil((maxPercent + 10) / 10) * 10);

    // Generate tick values in 10% increments
    const ticks = Array.from(
      { length: (roundedMax - roundedMin) / 10 + 1 },
      (_, i) => ((roundedMin + i * 10) * MAX_VOTE_PRICE) / 100,
    );

    return {
      minValue: (roundedMin * MAX_VOTE_PRICE) / 100,
      maxValue: (roundedMax * MAX_VOTE_PRICE) / 100,
      tickValues: ticks,
    };
  }, [data]);

  return { minValue, maxValue, tickValues };
}

export function PriceHistoryChart({ data: rawData, chartWindow }: LineChartProps) {
  const { token } = theme.useToken();
  const { minValue, maxValue, tickValues } = useScaleTicks(rawData);

  const formattedData = useMemo<LineData[]>(() => {
    return [
      {
        id: 'trust',
        data: rawData.map((point) => ({
          x: point.time,
          y: point.trust,
        })),
      },
      {
        id: 'distrust',
        data: rawData.map((point) => ({
          x: point.time,
          y: point.distrust,
        })),
      },
    ];
  }, [rawData]);

  const colors = {
    trust: tailwindTheme.colors.trust,
    distrust: tailwindTheme.colors.distrust,
  };

  return (
    <ResponsiveLine
      layers={[
        'grid',
        'markers',
        'axes',
        'areas',
        'crosshair',
        'lines',
        'slices',

        ({ xScale, yScale, data }: CustomLineLayerProps) => {
          if (!data[0].data.length) return null;

          return (
            <g>
              {data.map((series) => {
                const lastPoint = series.data[series.data.length - 1];
                // @ts-expect-error nivo types are poor
                const x = xScale(lastPoint.x);
                // @ts-expect-error nivo types are poor
                const y = yScale(lastPoint.y);
                const isDistrust = series.id === 'distrust';

                return (
                  <g key={series.id} transform={`translate(${x}, ${y.toString()})`}>
                    <rect
                      x={8}
                      y={-12}
                      width={60}
                      height={24}
                      rx={4}
                      fill={
                        isDistrust ? tailwindTheme.colors.distrustBg : tailwindTheme.colors.trustBg
                      }
                    />
                    <foreignObject x={15} y={-9} width={16} height={16}>
                      {isDistrust ? (
                        <ThumbsDownOutlinedIcon
                          style={{
                            fontSize: 14,
                            color: colors.distrust,
                          }}
                        />
                      ) : (
                        <ThumbsUpOutlinedIcon
                          style={{
                            fontSize: 14,
                            color: colors.trust,
                          }}
                        />
                      )}
                    </foreignObject>
                    <text
                      x={32}
                      y={4}
                      textAnchor="start"
                      style={{
                        fill: isDistrust ? colors.distrust : colors.trust,
                        fontSize: 12,
                      }}
                    >
                      {votePriceToPercentage(Number(lastPoint.y))}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        },
      ]}
      data={formattedData}
      curve="monotoneX"
      margin={{ top: 20, right: 70, bottom: 60, left: 50 }}
      yFormat={(value) => votePriceToPercentage(Number(value))}
      axisTop={null}
      axisLeft={null}
      axisRight={{
        format: (value) => `${Math.round((Number(value) / 0.001) * 100)}%`,
        tickValues,
        tickSize: 0,
        tickPadding: 25,
      }}
      axisBottom={{
        format: (value: Date) => TIME_WINDOW_FORMATTERS[chartWindow](value),
        tickValues: (() => {
          const data = formattedData[0]?.data || [];
          const totalPoints = data.length;
          const interval = Math.max(1, Math.floor(totalPoints / 8));

          return data.filter((_, i) => i % interval === 0).map((d) => d.x);
        })(),
        tickRotation: -45,
        tickPadding: 10,
        tickSize: 0,
      }}
      yScale={{
        type: 'linear',
        min: minValue,
        max: maxValue,
        clamp: true,
      }}
      sliceTooltip={({ slice }) => {
        // Sort points to ensure trust comes before distrust
        const sortedPoints = [...slice.points].sort((a) => (a.serieId === 'trust' ? -1 : 1));

        return (
          <div className="bg-antd-colorBgLayout py-4 px-10 flex flex-col gap-2 rounded-lg">
            <Typography.Text className="text-antd-colorTextHeading">
              {TIME_WINDOW_FORMATTERS[chartWindow](new Date(slice.points[0].data.x))}
            </Typography.Text>
            {sortedPoints.map((point) => (
              <div
                key={point.serieId}
                className={clsx('flex items-center gap-1', {
                  'text-distrust': point.serieId === 'distrust',
                  'text-trust': point.serieId === 'trust',
                })}
              >
                {point.serieId === 'distrust' ? (
                  <ThumbsDownOutlinedIcon style={{ fontSize: 14 }} />
                ) : (
                  <ThumbsUpOutlinedIcon style={{ fontSize: 14 }} />
                )}
                <span>{point.serieId === 'trust' ? 'Yes' : 'No'}</span>
                <span>{votePriceToPercentage(Number(point.data.y))}</span>
              </div>
            ))}
          </div>
        );
      }}
      enableGridX={false}
      enableGridY={false}
      enablePoints={false}
      colors={[colors.trust, colors.distrust]}
      enableArea={false}
      areaOpacity={0.15}
      enableSlices="x"
      crosshairType="cross"
      theme={{
        background: token.colorBgContainer,
        text: {
          color: token.colorTextTertiary,
        },
        legends: {
          text: {
            fill: token.colorTextTertiary,
          },
          ticks: {
            text: {
              fill: token.colorTextTertiary,
            },
          },
        },
        axis: {
          ticks: {
            text: {
              fill: token.colorTextTertiary,
            },
          },
        },
      }}
    />
  );
}

export function FormattedPriceHistoryChart({
  priceHistoryData,
  chartWindow,
}: {
  priceHistoryData: MarketPriceHistory;
  chartWindow: ChartWindow;
}) {
  const priceHistoryChartData = useMemo(() => {
    if (!priceHistoryData) return [];

    return priceHistoryData.data.map((value) => ({
      time: value.time,
      trust: Number(formatEther(BigInt(value.trust), 'wei')),
      distrust: Number(formatEther(BigInt(value.distrust), 'wei')),
    }));
  }, [priceHistoryData]);

  return <PriceHistoryChart data={priceHistoryChartData} chartWindow={chartWindow} />;
}
