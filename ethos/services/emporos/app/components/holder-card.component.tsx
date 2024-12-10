import { Flex, Progress, Skeleton, Tooltip, Typography } from 'antd';
import clsx from 'clsx';
import { MarketUserAvatar } from './avatar/user-avatar.component.tsx';
import { ThumbsDownFilledIcon, ThumbsUpFilledIcon } from './icons/thumbs.tsx';
import { tokenCssVars } from '~/config/theme.ts';
import { type useRouteMarketInfo } from '~/hooks/market.tsx';
import { type MarketHoldersInfo } from '~/types/markets.ts';

export function HolderCard({
  holder,
  market,
}: {
  holder: MarketHoldersInfo;
  market: Awaited<ReturnType<typeof useRouteMarketInfo>>;
}) {
  let votePercentage = 0;
  const { user } = holder;

  if (holder.voteType === 'trust') {
    votePercentage =
      market.stats.trustVotes === 0 ? 0 : Number(holder.total) / Number(market.stats.trustVotes);
  } else if (market && holder.voteType === 'distrust') {
    votePercentage =
      market.stats.distrustVotes === 0
        ? 0
        : Number(holder.total) / Number(market.stats.distrustVotes);
  }

  return (
    <Flex
      align="center"
      justify="left"
      gap={12}
      className="bg-antd-colorBgContainer rounded-lg py-3 px-4"
    >
      <MarketUserAvatar
        avatarUrl={user.avatarUrl}
        size="xs"
        ethosScore={user.ethosInfo.score}
        address={user.address}
      />
      <Flex vertical justify="space-between" gap={4} className="grow">
        <Flex justify="space-between" gap={4} align="baseline">
          <Flex justify="start" align="baseline" gap={2}>
            <Typography.Title level={5}>{user.name}</Typography.Title>
          </Flex>
          <Tooltip title={`${Math.round(votePercentage * 100)}% of ${holder.voteType} votes owned`}>
            <Progress
              showInfo={false}
              size={18}
              type="circle"
              strokeColor={tokenCssVars.colorTextSecondary}
              percent={votePercentage * 100}
              className="ml-auto"
            />
          </Tooltip>
        </Flex>
        <Typography.Text className="flex items-center gap-1 leading-none">
          <span
            className={clsx({
              'text-trust': holder.voteType === 'trust',
              'text-distrust': holder.voteType === 'distrust',
              'font-semibold': true,
            })}
          >
            {holder.voteType === 'trust' ? <ThumbsUpFilledIcon /> : <ThumbsDownFilledIcon />}{' '}
            {holder.total.toString()} {holder.voteType === 'trust' ? '  yes' : '  no'}
          </span>
        </Typography.Text>
      </Flex>
    </Flex>
  );
}

function SkeletonHolderCard() {
  return (
    <Flex
      align="center"
      justify="left"
      gap={6}
      className="bg-antd-colorBgContainer rounded-lg py-3 px-4"
    >
      <Skeleton.Avatar size={40} />
      <Flex vertical justify="space-between" gap={4} className="grow">
        <Flex justify="space-between" gap={4} align="baseline">
          <Skeleton paragraph={false} />
          <Skeleton.Avatar size={18} />
        </Flex>
        <Skeleton paragraph={false} />
      </Flex>
    </Flex>
  );
}

HolderCard.Skeleton = SkeletonHolderCard;
