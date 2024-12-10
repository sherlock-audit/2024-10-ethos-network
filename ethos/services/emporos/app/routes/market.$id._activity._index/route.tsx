import { type PaginatedResponse } from '@ethos/helpers';
import { type LoaderFunctionArgs } from '@remix-run/node';
import { Await, useLoaderData } from '@remix-run/react';
import { Col, Row } from 'antd';
import { Suspense } from 'react';
import { ActivityCard } from '~/components/activity-card.component.tsx';
import { getMarketActivity } from '~/services.server/market-activity.ts';
import { type MarketActivity } from '~/types/activity.ts';
import { getVoteTypeFilter } from '~/utils/getVoteTypeFilter.ts';

function RecentActivitySection({
  recentActivity,
}: {
  recentActivity: Promise<PaginatedResponse<MarketActivity>>;
}) {
  return (
    <Row
      gutter={[
        { xs: 16, sm: 16, md: 16 },
        { xs: 16, sm: 16, md: 16 },
      ]}
    >
      <Suspense fallback={<SkeletonRecentActivitySection />}>
        <Await resolve={recentActivity}>
          {(activities) =>
            activities.values.map((activity) => (
              <Col xs={24} sm={24} lg={24} key={activity.eventId}>
                <ActivityCard activity={activity} />
              </Col>
            ))
          }
        </Await>
      </Suspense>
    </Row>
  );
}

function SkeletonRecentActivitySection() {
  return Array.from({ length: 6 }).map((_, index) => (
    <Col xs={24} sm={24} lg={24} key={index}>
      <ActivityCard.Skeleton />
    </Col>
  ));
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const type = getVoteTypeFilter(url.searchParams.get('filter') ?? '');
  const recentActivityPromise = getMarketActivity({
    marketProfileId: Number(params.id),
    type,
    pagination: {
      limit: 30,
      offset: 0,
    },
  });

  return { recentActivity: recentActivityPromise };
}

export default function MarketActivityPage() {
  const { recentActivity } = useLoaderData<typeof loader>();

  return <RecentActivitySection recentActivity={recentActivity} />;
}
