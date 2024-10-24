import { Grid, Table, type TableProps } from 'antd';
import { type Address } from 'viem';
import { MarketCapLabel } from './_components/market-cap.component';
import { RelativeDateTime } from 'components/RelativeDateTime';
import { UserAvatarGroup } from 'components/avatar/avatar-group.component';
import { PersonWithAvatar } from 'components/person-with-avatar/person-with-avatar.component';
import { useAllMarkets } from 'hooks/market/market.hooks';

type AllMarketData = NonNullable<ReturnType<typeof useAllMarkets>['data']>;
type MarketData = AllMarketData[number];

export function MarketsList() {
  const { data, isLoading } = useAllMarkets();
  const screens = Grid.useBreakpoint();
  const columns = useColumns(screens);

  return (
    <Table
      dataSource={data}
      size={(screens.xs ?? screens.sm) ? 'small' : 'middle'}
      rowKey="profileId"
      loading={isLoading}
      columns={columns}
      onRow={(record) => ({
        onClick: () => {
          window.open(`/mrkt/profile/${record.profileId}`, '_blank');
        },
        style: { cursor: 'pointer' },
      })}
      pagination={false}
    />
  );
}

function useColumns(screens: ReturnType<typeof Grid.useBreakpoint>) {
  const columns: TableProps<MarketData>['columns'] = [
    {
      title: 'Market',
      dataIndex: 'profileId',
      render: (profileId: number) => (
        <PersonWithAvatar target={{ profileId }} showName={screens.md} />
      ),
    },

    {
      title: 'Cap',
      dataIndex: 'marketCap',
      render: (marketCap) => <MarketCapLabel marketCap={marketCap} />,
    },
    {
      title: 'Participants',
      dataIndex: 'participants',
      render: (participants: Address[]) => (
        <UserAvatarGroup targets={participants.map((p) => ({ address: p }))} max={{ count: 20 }} />
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      render: (createdAt: Date) => (
        <RelativeDateTime timestamp={createdAt} verbose={!screens.xs && !screens.sm} />
      ),
    },
  ];

  return columns;
}
