import { type ProfileId } from '@ethos/blockchain-manager';
import { getDateFromUnix, formatDate, formatEth } from '@ethos/helpers';
import { Flex, Typography, Tooltip } from 'antd';
import { useMemo } from 'react';
import { UserAvatar } from 'components/avatar/avatar.component';
import { VouchFilled } from 'components/icons';
import { PersonName } from 'components/person-name/person-name.component';
import { TooltipIconWrapper } from 'components/tooltip/tooltip-icon-wrapper';
import { useWeiToUSD } from 'hooks/api/eth-to-usd-rate.hook';
import { useActor } from 'hooks/user/activities';
import { useGetVouch } from 'hooks/user/hooks';

const { Text } = Typography;

export function Voucher({ author, vouchId }: { author: ProfileId; vouchId: number }) {
  const target = useMemo(
    () => ({
      profileId: author,
    }),
    [author],
  );
  const vouch = useGetVouch(vouchId).data;
  const vouchedAmountInUSD = useWeiToUSD(vouch?.staked ?? 0n);
  const vouchedAtTimestamp = getDateFromUnix(vouch?.activityCheckpoints.vouchedAt ?? 0);
  const user = useActor(target);

  return (
    <Flex key={user.name} align="center" justify="space-between" css={{ width: '100%' }}>
      <Flex gap={16} align="center" flex={1} css={{ minWidth: 0, maxWidth: 'calc(100% - 54px)' }}>
        <UserAvatar actor={user} />
        <Flex vertical gap={4} flex={1} css={{ minWidth: 0, overflow: 'hidden' }}>
          <PersonName target={user} color="colorText" weight="default" ellipsis />
          <Text
            type="secondary"
            ellipsis={{
              tooltip: true,
            }}
          >
            <Tooltip title="Vouched since">
              <TooltipIconWrapper>
                <VouchFilled />
              </TooltipIconWrapper>
            </Tooltip>{' '}
            {formatDate(vouchedAtTimestamp.getTime(), { dateStyle: 'medium' })}
          </Text>
        </Flex>
      </Flex>
      <Flex justify="flex-end" css={{ width: 54 }}>
        <Tooltip title={`${formatEth(vouch?.balance ?? 0n)} vouched`}>
          <Text strong>{vouchedAmountInUSD ?? formatEth(vouch?.balance ?? 0n, 'wei')}</Text>
        </Tooltip>
      </Flex>
    </Flex>
  );
}
