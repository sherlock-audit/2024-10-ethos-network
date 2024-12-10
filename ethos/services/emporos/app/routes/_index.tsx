import { duration, type PaginatedResponse } from '@ethos/helpers';
import { type HeadersFunction, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Await, useLoaderData } from '@remix-run/react';
import { Col, Flex, Row } from 'antd';
import { Suspense } from 'react';
import { ActivityCard } from '~/components/activity-card.component.tsx';
import { CardSection } from '~/components/layout/card-section.tsx';
import { LargeMarketCard } from '~/components/markets/large-market-card.component.tsx';
import { MarketStatsCard } from '~/components/markets/market-stats-card.component.tsx';
import { SmallMarketCard } from '~/components/markets/small-market-card.component.tsx';
import { getAllRecentActivity } from '~/services.server/market-activity.ts';
import { getMarketList, getTopMovers, getTopVolume } from '~/services.server/markets.ts';
import { type MarketActivity } from '~/types/activity.ts';
import { type MarketVolume, type Market, type MarketWithStats } from '~/types/markets.ts';

// eslint-disable-next-line func-style
export const meta: MetaFunction = ({ matches }) => {
  const parentMeta = matches.flatMap((match) => match.meta ?? []);

  return [
    ...parentMeta,
    { title: 'Ethos Markets' },
    { name: 'description', content: 'Welcome to Ethos Markets!' },
  ];
};

// eslint-disable-next-line func-style
export const headers: HeadersFunction = () => ({
  'Cache-Control': 'public, max-age=30, stale-while-revalidate=30',
});

export async function loader(_args: LoaderFunctionArgs) {
  const oneDayAgo = new Date(Date.now() - duration(1, 'day').toMilliseconds());
  const [markets, topMovers, topVolume] = await Promise.all([
    getMarketList().then((markets) => markets.slice(0, 4)),
    getTopMovers(oneDayAgo, 4),
    getTopVolume(oneDayAgo, 4),
  ]);

  const recentActivityPromise = getAllRecentActivity('all', { limit: 6, offset: 0 });

  return {
    markets,
    topMovers,
    topVolume,
    recentActivity: recentActivityPromise,
  };
}

export default function Index() {
  const { markets, topMovers, topVolume, recentActivity } = useLoaderData<typeof loader>();

  return (
    <Flex vertical gap={48} align="center" className="w-full md:max-w-[1280px]">
      <PeopleSection markets={markets} />
      <TopVolumeSection topVolume={topVolume} />
      <TopMoversSection topMovers={topMovers} />
      <RecentActivitySection recentActivity={recentActivity} />
    </Flex>
  );
}

function PeopleSection({ markets }: { markets: MarketWithStats[] }) {
  return (
    <CardSection title="People" seeAllLink="/markets/all">
      <Row
        gutter={[
          { xs: 16, sm: 16, md: 24 },
          { xs: 16, sm: 16, md: 24 },
        ]}
      >
        {markets.map((market) => (
          <Col xs={24} sm={24} md={12} key={market.profileId}>
            <LargeMarketCard market={market} />
          </Col>
        ))}
      </Row>
    </CardSection>
  );
}

function TopVolumeSection({ topVolume }: { topVolume: MarketVolume[] }) {
  return (
    <CardSection title="Top Volume">
      <Row
        gutter={[
          { xs: 16, sm: 16, md: 24 },
          { xs: 16, sm: 16, md: 24 },
        ]}
      >
        {topVolume.map((marketVolume, index) => (
          <Col xs={24} sm={24} md={12} key={marketVolume.market.profileId}>
            <MarketStatsCard
              {...marketVolume}
              accessory={
                <h1 className="px-4 py-2 bg-antd-colorBgElevated rounded-lg">{index + 1}</h1>
              }
            />
          </Col>
        ))}
      </Row>
    </CardSection>
  );
}

function TopMoversSection({ topMovers }: { topMovers: Market[] }) {
  return (
    <CardSection title="Top Movers">
      <Row
        gutter={[
          { xs: 16, sm: 16, md: 24 },
          { xs: 16, sm: 16, md: 24 },
        ]}
      >
        {topMovers.map((market) => (
          <Col xs={24} sm={12} md={6} key={market.profileId}>
            <SmallMarketCard market={market} />
          </Col>
        ))}
      </Row>
    </CardSection>
  );
}

function RecentActivitySection({
  recentActivity,
}: {
  recentActivity: Promise<PaginatedResponse<MarketActivity>>;
}) {
  return (
    <CardSection title="Recent Activity">
      <Row
        gutter={[
          { xs: 16, sm: 16, md: 24 },
          { xs: 16, sm: 16, md: 24 },
        ]}
      >
        <Suspense fallback={<RecentActivitySkeleton />}>
          <Await resolve={recentActivity}>
            {(activities) =>
              activities.values.map((activity) => (
                <Col xs={24} sm={24} md={12} key={activity.eventId}>
                  <ActivityCard activity={activity} />
                </Col>
              ))
            }
          </Await>
        </Suspense>
      </Row>
    </CardSection>
  );
}

function RecentActivitySkeleton() {
  return Array.from({ length: 6 }).map((_, index) => (
    <Col xs={24} sm={24} md={12} key={index}>
      <ActivityCard.Skeleton />
    </Col>
  ));
}
