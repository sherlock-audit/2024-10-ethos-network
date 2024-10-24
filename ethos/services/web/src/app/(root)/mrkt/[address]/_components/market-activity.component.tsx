import { css } from '@emotion/react';
import { formatEth } from '@ethos/helpers';
import { Card, Col, List, Row, Typography } from 'antd';
import { getAddress } from 'viem';
import { ViewTxn } from 'app/(root)/activity/_components/view.txn.component';
import { UserAvatar } from 'components/avatar/avatar.component';
import { tokenCssVars } from 'config';
import { useMarketTransactionHistory } from 'hooks/market/market.hooks';
import { useActor } from 'hooks/user/activities';
import { type echoApi } from 'services/echo';

type MarketTransaction = Awaited<ReturnType<typeof echoApi.markets.transactionHistory>>[number];

type Props = {
  market?: Awaited<ReturnType<typeof echoApi.markets.info>>;
};

export function MarketActivityList({ market }: Props) {
  const { data: transactions, isLoading } = useMarketTransactionHistory(market?.profileId ?? 0);

  const cardStyle = css`
    height: 100%;
    box-shadow: ${tokenCssVars.boxShadowTertiary};
    .ant-card-body {
      height: 100%;
    }
  `;

  return (
    <Row gutter={[0, 12]}>
      <Col span={24}>
        <Typography.Title level={4}>Activity</Typography.Title>
      </Col>
      <Col span={24}>
        <Card css={cardStyle}>
          <List
            size="default"
            dataSource={transactions ?? []}
            loading={isLoading}
            renderItem={(item: MarketTransaction) => <ActivityItem item={item} />}
          />
        </Card>
      </Col>
    </Row>
  );
}

function ActivityItem({ item }: { item: MarketTransaction }) {
  const target = { address: getAddress(item.actorAddress) };
  const actor = useActor(target);

  return (
    <List.Item extra={<ViewTxn txnHash={item.txHash} />}>
      <List.Item.Meta
        avatar={<UserAvatar actor={actor} />}
        title={actor.name}
        description={toActivityString(item)}
      />
    </List.Item>
  );
}

function toActivityString(item: MarketTransaction) {
  const price = formatEth(item.votes === 0 ? 0n : BigInt(item.funds) / BigInt(item.votes), 'wei', {
    maximumFractionDigits: 5,
  });
  const verbPhrase = item.type === 'BUY' ? 'bought ' : 'sold ';
  const nounPhrase = (
    <span
      css={css`
        color: ${item.voteType === 'trust' ? tokenCssVars.colorSuccess : tokenCssVars.colorError};
      `}
    >{`${item.votes} ${item.voteType === 'trust' ? 'trust' : 'distrust'} votes `}</span>
  );
  const pricePhrase = (
    <span>{`at ${price} (${formatEth(BigInt(item.funds), 'wei', { maximumFractionDigits: 5 })})`}</span>
  );

  return (
    <span>
      {verbPhrase}
      {nounPhrase}
      {pricePhrase}
    </span>
  );
}
