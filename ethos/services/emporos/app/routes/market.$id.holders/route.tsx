import { type LoaderFunctionArgs } from '@remix-run/node';
import { Await, useLoaderData } from '@remix-run/react';
import { Col, Row } from 'antd';
import { Suspense } from 'react';
import { HolderCard } from '~/components/holder-card.component.tsx';
import { useRouteMarketInfo } from '~/hooks/market.tsx';
import { getMarketHoldersInfo } from '~/services.server/markets.ts';
import { type MarketHoldersInfo } from '~/types/markets.ts';
import { getVoteTypeFilter } from '~/utils/getVoteTypeFilter.ts';

function HoldersSection({ holders }: { holders: Promise<MarketHoldersInfo[]> }) {
  const market = useRouteMarketInfo();

  return (
    <Row
      gutter={[
        { xs: 16, sm: 16, md: 16 },
        { xs: 16, sm: 16, md: 16 },
      ]}
    >
      <Suspense fallback={<SkeletonHoldersSection />}>
        <Await resolve={holders}>
          {(resolvedHolders) =>
            resolvedHolders.map((holder) => (
              <Col xs={24} sm={24} lg={12} key={`${holder.actorAddress}-${holder.voteType}`}>
                <HolderCard holder={holder} market={market} />
              </Col>
            ))
          }
        </Await>
      </Suspense>
    </Row>
  );
}

function SkeletonHoldersSection() {
  return Array.from({ length: 6 }).map((_, index) => (
    <Col xs={24} sm={24} lg={12} key={index}>
      <HolderCard.Skeleton />
    </Col>
  ));
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const voteType = getVoteTypeFilter(url.searchParams.get('filter') ?? '');
  const marketId = Number(params.id);

  const holdersPromise = getMarketHoldersInfo(marketId, voteType);

  return { holders: holdersPromise };
}

export default function MarketHoldersPage() {
  const { holders } = useLoaderData<typeof loader>();

  return <HoldersSection holders={holders} />;
}
