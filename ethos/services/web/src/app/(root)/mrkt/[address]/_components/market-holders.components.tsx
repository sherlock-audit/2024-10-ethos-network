import { css } from '@emotion/react';
import { Row, Col, Typography, List, Card, Progress, Tooltip } from 'antd';
import { getAddress } from 'viem';
import { UserAvatar } from 'components/avatar/avatar.component';
import { tokenCssVars } from 'config';
import { useMarketHolders } from 'hooks/market/market.hooks';
import { useActor } from 'hooks/user/activities';
import { type echoApi } from 'services/echo';

type MarketHolder = Awaited<ReturnType<typeof echoApi.markets.holders>>['trust'][number];

type Props = {
  market?: Awaited<ReturnType<typeof echoApi.markets.info>>;
};

export function MarketHolderLists({ market }: Props) {
  const { data, isLoading } = useMarketHolders(market?.profileId ?? 0);

  const cardStyle = css`
    height: 100%;
    box-shadow: ${tokenCssVars.boxShadowTertiary};
    .ant-card-body {
      height: 100%;
    }
  `;

  return (
    <Row gutter={[12, 12]}>
      <Col span={24}>
        <Typography.Title level={4}>Holders</Typography.Title>
      </Col>
      <Col xs={24} sm={12} md={24} lg={12}>
        <Card
          css={cardStyle}
          size="small"
          title={<Typography.Title level={4}>Trust</Typography.Title>}
        >
          <List
            dataSource={data?.trust ?? []}
            loading={isLoading}
            renderItem={(item) => <HolderItem item={item} market={market} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={24} lg={12}>
        <Card
          css={cardStyle}
          size="small"
          title={<Typography.Title level={4}>Distrust</Typography.Title>}
        >
          <List
            dataSource={data?.distrust ?? []}
            loading={isLoading}
            renderItem={(item) => <HolderItem item={item} market={market} />}
          />
        </Card>
      </Col>
    </Row>
  );
}

function HolderItem({ item, market }: { item: MarketHolder; market: Props['market'] }) {
  const target = { address: getAddress(item.actorAddress) };
  const user = useActor(target);

  let votePercentage = 0;

  if (market && item.voteType === 'trust') {
    votePercentage = market.trustVotes === 0 ? 0 : Number(item.total) / Number(market.trustVotes);
  } else if (market && item.voteType === 'distrust') {
    votePercentage =
      market.distrustVotes === 0 ? 0 : Number(item.total) / Number(market.distrustVotes);
  }

  return (
    <List.Item
      extra={
        <Tooltip title={`${Math.round(votePercentage * 100)}% of ${item.voteType} votes owned`}>
          <Progress
            showInfo={false}
            size={18}
            type="circle"
            strokeColor={tokenCssVars.colorTextSecondary}
            percent={votePercentage * 100}
            css={css`
              margin-left: auto;
            `}
          />
        </Tooltip>
      }
    >
      <List.Item.Meta
        avatar={<UserAvatar actor={user} />}
        title={user.name}
        description={
          <Typography.Text>
            <span
              css={css`
                color: ${item.voteType === 'trust'
                  ? tokenCssVars.colorSuccess
                  : tokenCssVars.colorError};
              `}
            >
              {Number(item.total)} {item.voteType} votes
            </span>
          </Typography.Text>
        }
      />
    </List.Item>
  );
}
