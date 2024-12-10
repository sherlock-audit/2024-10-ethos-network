import { BarChartOutlined, LineChartOutlined } from '@ant-design/icons';
import { Await } from '@remix-run/react';
import { Flex, Segmented, Skeleton, Typography } from 'antd';
import { Suspense } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { FormattedPriceHistoryChart } from './price-history-chart.client.tsx';
import { ChartLogoWatermark } from '~/components/icons/chart-logo-watermark.tsx';
import { type ChartWindow, chartWindowOptions, type MarketPriceHistory } from '~/types/charts.ts';
import { useChartParams } from '~/utils/chart.utils.ts';

export function MarketHistory({
  priceHistoryPromise,
}: {
  priceHistoryPromise: Promise<MarketPriceHistory>;
}) {
  const [chartParams, setChartWindow] = useChartParams();

  return (
    <div className="relative px-4 lg:px-6">
      <Flex justify="space-between" className="py-4">
        <Typography.Title level={5} className="text-antd-colorTextHeading flex gap-1 items-center">
          <BarChartOutlined />
          Reputation history
        </Typography.Title>
        <Segmented<ChartWindow>
          options={[...chartWindowOptions]}
          value={chartParams.window}
          onChange={(window) => {
            setChartWindow({ window });
          }}
        />
      </Flex>
      <div className="h-80">
        <Suspense fallback={<ChartSkeleton />}>
          <Await resolve={priceHistoryPromise}>
            {(data) => (
              // Nivo Chart ESM support is currently broken, so we need to use it in a client-only component
              // https://github.com/plouc/nivo/issues/2310#issuecomment-2313388777
              <ClientOnly fallback={<ChartSkeleton />}>
                {() => (
                  <FormattedPriceHistoryChart
                    priceHistoryData={data}
                    chartWindow={chartParams.window}
                  />
                )}
              </ClientOnly>
            )}
          </Await>
        </Suspense>
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-antd-colorText opacity-10">
        <ChartLogoWatermark />
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="px-4 flex flex-col">
      <Skeleton.Node active className="h-80 w-full text-5xl">
        <LineChartOutlined />
      </Skeleton.Node>
    </div>
  );
}
