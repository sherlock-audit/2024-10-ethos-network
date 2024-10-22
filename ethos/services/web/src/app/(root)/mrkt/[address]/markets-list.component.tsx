import { Table } from 'antd';
import { type ColumnType } from 'antd/es/table';
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

  const columns: Array<ColumnType<MarketData>> = [
    {
      title: 'Market',
      dataIndex: 'profileId',
      render: (profileId: number) => <PersonWithAvatar target={{ profileId }} />,
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
      render: (createdAt: Date) => <RelativeDateTime timestamp={createdAt} verbose />,
    },
  ];

  return (
    <Table
      dataSource={data}
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
