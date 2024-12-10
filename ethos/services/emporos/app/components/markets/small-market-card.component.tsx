import { Link } from '@remix-run/react';
import { Flex, Typography } from 'antd';
import { HandshakeIcon } from '../icons/handshake.tsx';
import { MarketAvatar } from '~/components/avatar/market-avatar.component.tsx';
import { type Market } from '~/types/markets.ts';
import { percentToTailwindTextClass } from '~/utils/percent.utils.ts';

export function SmallMarketCard({ market }: { market: Market }) {
  return (
    <Link to={`/market/${market.profileId}`} className="relative">
      <Flex
        align="center"
        justify="left"
        gap={16}
        className="bg-antd-colorBgContainer rounded-lg p-3"
      >
        <MarketAvatar avatarUrl={market.avatarUrl} size="xs" />
        <Flex vertical justify="space-between">
          <Typography.Text
            type="secondary"
            className={percentToTailwindTextClass(market.trustPercentage)}
          >
            <span>
              <HandshakeIcon /> {Math.round(market.trustPercentage)}% Trust in
            </span>
          </Typography.Text>
          <Typography.Title level={5}>{market.name}</Typography.Title>
        </Flex>
      </Flex>
    </Link>
  );
}
