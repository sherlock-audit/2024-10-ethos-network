import { type LiteProfile, type EthosUserTarget } from '@ethos/domain';
import { formatEth, pluralize } from '@ethos/helpers';
import { Flex, type FlexProps, Tooltip, Typography } from 'antd';
import { VouchFilled } from 'components/icons';
import { TooltipIconWrapper } from 'components/tooltip/tooltip-icon-wrapper';
import { useEthToUSD } from 'hooks/api/eth-to-usd-rate.hook';
import { useVouchStats } from 'hooks/user/lookup';

const { Text } = Typography;

type Props = {
  target: EthosUserTarget;
  profile?: LiteProfile | null;
  isCompact?: boolean;
};

export function VouchStats({ target, profile, isCompact = true }: Props) {
  const vouchStats = useVouchStats(target).data;
  const vouchedInUSD = useEthToUSD(vouchStats?.staked.received ?? 0);

  if (!profile) {
    return <Text type="secondary">Not an Ethos user</Text>;
  }

  if (!vouchStats?.count?.received) {
    return <Text type="secondary">No vouches</Text>;
  }

  return (
    <Text type="secondary" ellipsis={true}>
      <Tooltip title={`${vouchStats?.staked.received ?? 0}e vouched`}>
        <Text strong type="secondary">
          {vouchedInUSD ?? formatEth(vouchStats?.staked.received ?? 0, 'eth')}
        </Text>{' '}
      </Tooltip>
      vouched ({vouchStats?.count.received ?? 0}
      {isCompact
        ? ''
        : ` ${pluralize(vouchStats?.count.received ?? 0, 'vouch', 'vouches')}`})
    </Text>
  );
}

export function VouchStatsRow({
  target,
  profile,
  isCompact = true,
  ...props
}: Props & Omit<FlexProps, 'children'>) {
  return (
    <Flex gap={6} align="center" {...props}>
      <Tooltip title="Vouches">
        <TooltipIconWrapper>
          <VouchFilled />
        </TooltipIconWrapper>
      </Tooltip>
      <VouchStats target={target} profile={profile} isCompact={isCompact} />
    </Flex>
  );
}
