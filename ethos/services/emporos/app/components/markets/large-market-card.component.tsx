import { formatCurrency } from '@ethos/helpers';
import { Link } from '@remix-run/react';
import { Button, Card, Flex, Grid, Progress, Tooltip, Typography } from 'antd';
import { CommentIcon } from '../icons/comment.tsx';
import { HandshakeIcon } from '../icons/handshake.tsx';
import { LineChartIcon } from '../icons/line-chart.tsx';
import { MarketAvatar } from '~/components/avatar/market-avatar.component.tsx';
import { ThumbsDownFilledIcon, ThumbsUpFilledIcon } from '~/components/icons/thumbs.tsx';
import { type MarketWithStats } from '~/types/markets.ts';
import { percentToAntdCssVar } from '~/utils/percent.utils.ts';

export function LargeMarketCard({ market }: { market: MarketWithStats }) {
  const breakpoints = Grid.useBreakpoint();

  return (
    <Card rootClassName="px-2 lg:px-4 relative py-12">
      <MarketCardHeader />
      <Flex vertical gap={26}>
        <Flex align="center" justify="space-between" gap={16}>
          <MarketAvatar avatarUrl={market.avatarUrl} size={breakpoints.xs ? 'small' : 'default'} />
          <span className="text-lg flex-wrap break-words text-center flex-1 min-w-0">
            {'Do you trust '}
            <span className="font-semibold">{market.name}</span>?
          </span>
          <Progress
            type="circle"
            percent={Math.round(market.stats.trustPercentage)}
            size={breakpoints.xs ? 64 : 80}
            strokeColor={percentToAntdCssVar(market.stats.trustPercentage)}
          />
        </Flex>
        <Flex gap={16} justify="space-evenly" className="mx-auto">
          <Link to={`/market/${market.profileId}/?voteType=trust`} className="grow">
            <Button className="text-trust px-10" size="large" icon={<ThumbsUpFilledIcon />}>
              Yes
            </Button>
          </Link>
          <Link to={`/market/${market.profileId}/?voteType=distrust`} className="grow">
            <Button className="text-distrust px-10 " size="large" icon={<ThumbsDownFilledIcon />}>
              No
            </Button>
          </Link>
        </Flex>
        <MarketCardFooter market={market} />
      </Flex>
    </Card>
  );
}

function MarketCardHeader() {
  return (
    <Flex
      align="center"
      justify="start"
      gap={4}
      className="text-antd-colorPrimary absolute top-0 left-0 right-0 py-2 p-2 border-b border-b-borderSecondary"
    >
      <HandshakeIcon />
      <Typography.Text className="text-antd-colorTextBase">Trust</Typography.Text>
    </Flex>
  );
}

function MarketCardFooter({ market }: { market: MarketWithStats }) {
  return (
    <Flex
      justify="space-between"
      className="py-2 absolute bottom-0 left-0 right-0 p-2 border-t border-t-borderSecondary"
    >
      <Tooltip title="Total volume">
        <Flex align="center" gap={8}>
          <LineChartIcon />
          <span>{formatCurrency(market.stats.totalVolumeUsd, 'USD')}</span>
        </Flex>
      </Tooltip>

      <Flex align="center" gap={8}>
        <CommentIcon />
        <span>{market.stats.totalComments}</span>
      </Flex>
    </Flex>
  );
}
