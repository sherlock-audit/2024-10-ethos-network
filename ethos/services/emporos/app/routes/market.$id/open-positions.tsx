import { formatEth } from '@ethos/helpers';
import { Button, Flex, Skeleton, Typography } from 'antd';
import clsx from 'clsx';
import { useTransactionForm } from './transaction-context.tsx';
import { HandCoinIcon } from '~/components/icons/hand-coin.tsx';
import { ThumbsDownFilledIcon, ThumbsUpFilledIcon } from '~/components/icons/thumbs.tsx';
import { useMyVotes } from '~/hooks/market.tsx';

export function OpenPositions() {
  const { state, setState } = useTransactionForm();
  const { data: positions } = useMyVotes(state.market.profileId);
  const { market } = state;

  function onSellClick(type: 'trust' | 'distrust', count: bigint) {
    setState({
      action: 'sell',
      voteType: type,
      sellAmount: Number(count),
    });
  }

  return (
    <Flex justify="left" gap={6} className="bg-antd-colorBgContainer rounded-lg py-3 px-4" vertical>
      <Typography.Title level={5}>
        <HandCoinIcon /> Open positions
      </Typography.Title>
      <Flex vertical className="w-full">
        {positions?.trustVotes ? (
          <PositionRow
            count={BigInt(positions.trustVotes)}
            type="trust"
            price={state.market.stats.trustPrice}
            onSellClick={() => {
              setState({
                action: 'sell',
                voteType: 'trust',
                sellAmount: Number(positions.trustVotes),
              });
            }}
          />
        ) : (
          <SkeletonPositionCard />
        )}
        {positions?.distrustVotes ? (
          <PositionRow
            count={BigInt(positions.distrustVotes)}
            type="distrust"
            price={BigInt(market.stats.distrustPrice)}
            onSellClick={onSellClick}
          />
        ) : (
          <SkeletonPositionCard />
        )}
      </Flex>
    </Flex>
  );
}

function SkeletonPositionCard() {
  return (
    <Flex gap={12} justify="space-between" align="center" className="py-2">
      <Flex vertical className="flex-grow wrap">
        <Skeleton paragraph={false} />
      </Flex>
      <Skeleton.Button size="small" />
    </Flex>
  );
}

function PositionRow({
  count,
  type,
  price,
  onSellClick = () => {},
}: {
  count: bigint;
  type: 'trust' | 'distrust';
  price: bigint;
  onSellClick: (type: 'trust' | 'distrust', count: bigint) => void;
}) {
  if (count === 0n) {
    return null;
  }

  return (
    <Flex gap={12} justify="space-between" align="center" className="py-2">
      <Flex vertical gap={4} className="flex-grow wrap">
        <Typography.Text
          strong
          className={clsx({
            'text-trust': type === 'trust',
            'text-distrust': type === 'distrust',
            'flex-shrink-0': true,
          })}
        >
          {type === 'trust' ? <ThumbsUpFilledIcon /> : <ThumbsDownFilledIcon />} {count.toString()}{' '}
          {type === 'trust' ? 'yes' : 'no'}
        </Typography.Text>
        <Typography.Text type="secondary" className="flex-grow wrap">
          Value:{' '}
          {formatEth(BigInt(price) * BigInt(count), 'wei', {
            minimumFractionDigits: 2,
          })}
        </Typography.Text>
      </Flex>
      <Button
        variant="outlined"
        color="primary"
        onClick={() => {
          onSellClick(type, count);
        }}
      >
        Sell
      </Button>
    </Flex>
  );
}
