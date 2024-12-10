import { useLoaderData } from '@remix-run/react';
import { List, Typography } from 'antd';
import { MarketCard } from '~/components/markets/market-card.component.tsx';
import { getMarketList } from '~/services.server/markets.ts';

export async function loader() {
  try {
    const markets = (await getMarketList()).sort(
      (a, b) => b.stats.totalVolumeUsd - a.stats.totalVolumeUsd,
    );

    return { markets };
  } catch (error) {
    console.error('Error loading markets:', error);

    return { markets: [] };
  }
}

export default function Markets() {
  const { markets } = useLoaderData<typeof loader>();

  return (
    <div className="w-full md:max-w-screen-sm">
      <Typography.Title level={2}>All Markets</Typography.Title>
      <List
        itemLayout="horizontal"
        dataSource={markets}
        renderItem={(market, index) => (
          <List.Item key={index} className="w-full">
            <MarketCard
              market={market}
              size="medium"
              accessory={
                <h1 className="px-4 py-2 bg-antd-colorBgElevated rounded-lg">{index + 1}</h1>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}
