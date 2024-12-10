import { formatEth } from '@ethos/helpers';
import { Link } from '@remix-run/react';
import { Card, Flex, Typography } from 'antd';

import { MarketAvatar } from '~/components/avatar/market-avatar.component.tsx';
import { ThumbsDownFilledIcon, ThumbsUpFilledIcon } from '~/components/icons/thumbs.tsx';
import { type getUserHoldingsByAddress } from '~/services.server/markets.ts';
import { cn } from '~/utils/cn.ts';

export function HoldingCard({
  holding,
}: {
  holding: Awaited<ReturnType<typeof getUserHoldingsByAddress>>[number];
}) {
  const { voteType, trustPrice, distrustPrice, totalAmount } = holding;

  const price = voteType === 'trust' ? trustPrice : distrustPrice;

  const params = new URLSearchParams({
    transact: '1',
    action: 'sell',
    voteType,
    sellAmount: totalAmount.toString(),
  });

  const formattedPrice = formatEth(BigInt(price) * totalAmount, 'wei', {
    minimumFractionDigits: 2,
  });

  return (
    <Card
      classNames={{
        body: 'py-3 px-4',
      }}
    >
      <Flex gap={12} align="center">
        <Link to={`/market/${holding.marketProfileId}`}>
          <MarketAvatar avatarUrl={holding.market.profile.avatarUrl} size="xs" />
        </Link>
        <Flex vertical gap={6} className="min-w-0">
          <Typography.Title level={5} ellipsis={{ tooltip: true }} className="text-antd-colorText">
            Do you trust <b>{holding.market.profile.name}</b>?
          </Typography.Title>
          <Typography.Text
            className={cn(
              'inline-flex items-center min-w-0 max-w-full gap-1',
              'text-xs/none text-antd-colorTextSecondary [&_*]:leading-none',
            )}
            ellipsis={{ tooltip: true }}
          >
            <b
              className={cn({
                'text-trust': voteType === 'trust',
                'text-distrust': voteType === 'distrust',
              })}
            >
              {holding.voteType === 'trust' ? <ThumbsUpFilledIcon /> : <ThumbsDownFilledIcon />}{' '}
              {holding.totalAmount.toString()} {holding.voteType}
            </b>
            <span className="hidden md:inline">votes</span>
            <span>({formattedPrice})</span>
            {/* TODO: replace this once we have the actual data */}
            <b className="pl-1">↑2.02%</b>
            <span className="hidden md:inline">(0.05e)</span>
          </Typography.Text>
        </Flex>
        <Link
          to={`/market/${holding.marketProfileId}?${params.toString()}`}
          className="text-antd-colorPrimary border border-antd-colorPrimary hover:opacity-70 rounded-md px-2 py-1 ml-auto"
        >
          Sell
        </Link>
      </Flex>
    </Card>
  );
}
