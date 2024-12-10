import { webUrlMap } from '@ethos/env';
import { type LinksFunction, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Outlet, useLoaderData, useSearchParams } from '@remix-run/react';
import { Col, Flex, Grid, Row, Select } from 'antd';
import { MarketInfoHeader } from './market-info-header.component.tsx';
import { MarketInfo } from './market-info.tsx';
import { OpenPositions } from './open-positions.tsx';
import { TabSection } from './tab-section.tsx';
import { TransactionProvider } from './transaction-context.tsx';
import { TransactionFooter } from './transaction-footer.tsx';
import { TransactionForm } from '~/components/transact-form/transact-form.component.tsx';
import { config } from '~/config/config.server.ts';
import { getMarketPriceHistory } from '~/services.server/market-activity.ts';
import { getMarketInfoByProfileId } from '~/services.server/markets.ts';
import { getChartParams } from '~/utils/chart.utils.ts';
import { type VoteTypeFilter, getVoteTypeFilter } from '~/utils/getVoteTypeFilter.ts';

// eslint-disable-next-line func-style
export const meta: MetaFunction<typeof loader> = ({ data, matches }) => {
  const parentMeta = matches.flatMap((match) => match.meta ?? []);

  return [...parentMeta, { title: `Do You Trust ${data?.market?.name}?` }];
};

// eslint-disable-next-line func-style
export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans&display=swap',
  },
];

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { window } = getChartParams(request);
  const market = await getMarketInfoByProfileId(Number(params.id));
  const priceHistoryPromise = getMarketPriceHistory(Number(params.id), window);
  const ethosWebUrl = webUrlMap[config.ETHOS_ENV];

  if (!market) {
    throw new Response('Market not found', {
      status: 404,
      statusText: 'Not Found',
    });
  }

  return { market, ethosWebUrl, priceHistoryPromise };
}

const activityOptions: Array<{ value: VoteTypeFilter; label: string }> = [
  {
    value: 'all',
    label: 'All',
  },
  {
    value: 'trust',
    label: 'Trust',
  },
  {
    value: 'distrust',
    label: 'Distrust',
  },
];

export default function MarketPage() {
  const { market, priceHistoryPromise } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const breakpoints = Grid.useBreakpoint();

  function onChange(value: VoteTypeFilter) {
    searchParams.set('filter', value);
    setSearchParams(searchParams, {
      preventScrollReset: true,
    });
  }

  return (
    <TransactionProvider market={market}>
      <div className="w-full min-h-screen flex flex-col">
        <Row gutter={[24, 24]} className="mb-4">
          <Col xs={24} md={24}>
            <Row gutter={[24, 24]}>
              <Col span={24}>
                <MarketInfoHeader market={market} />
              </Col>
            </Row>
          </Col>
        </Row>
        <Row gutter={[24, 24]} className="flex-grow relative">
          <Col xs={24} md={16} className="h-full">
            <Row gutter={[24, 24]}>
              <Col span={24}>
                <MarketInfo market={market} priceHistoryPromise={priceHistoryPromise} />
              </Col>
              <Col span={24}>
                <Flex vertical gap={16} className="w-full">
                  <div className="flex justify-between flex-col sm:flex-row gap-4">
                    <TabSection />
                    <Select
                      options={activityOptions}
                      value={getVoteTypeFilter(searchParams.get('filter') ?? '')}
                      onChange={onChange}
                      className="min-w-[120px] [&_.ant-select-selector]:!bg-antd-colorBgContainer"
                    />
                  </div>
                  <Outlet />
                </Flex>
              </Col>
            </Row>
          </Col>
          <Col xs={0} md={8} className="sticky top-4 h-max self-start">
            {breakpoints.md && (
              <Flex vertical gap={24}>
                <TransactionForm />
                <OpenPositions />
              </Flex>
            )}
          </Col>
        </Row>
        {!breakpoints.md && <TransactionFooter />}
      </div>
    </TransactionProvider>
  );
}
