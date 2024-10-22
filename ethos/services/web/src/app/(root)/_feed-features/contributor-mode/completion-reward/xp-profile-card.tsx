import { css } from '@emotion/react';
import { type EthosUserTarget } from '@ethos/domain';
import { formatEth } from '@ethos/helpers';
import { Card, Flex, Typography } from 'antd';
import { zeroAddress } from 'viem';
import { contributorModeCard, getCardWidthStyles } from '../styles';
import { UserAvatar } from 'components/avatar/avatar.component';
import { EthosStar, ReviewFilled, VouchFilled } from 'components/icons';
import { PersonName } from 'components/person-name/person-name.component';
import { tokenCssVars } from 'config';
import { useCurrentUser } from 'contexts/current-user.context';
import { useEthToUSD } from 'hooks/api/eth-to-usd-rate.hook';
import { useReviewStats, useVouchStats } from 'hooks/user/lookup';

const { cardWidth } = getCardWidthStyles({
  cardWidth: 350,
});

export function XpProfileCard({ xpTotal }: { xpTotal: number }) {
  const { connectedProfile, connectedActor } = useCurrentUser();
  const connectedUserTarget: EthosUserTarget | null = connectedProfile
    ? { profileId: connectedProfile.id }
    : null;

  const reviewStats = useReviewStats(connectedUserTarget ?? { address: zeroAddress }).data;
  const vouchStats = useVouchStats(connectedUserTarget ?? { address: zeroAddress }).data;

  const vouchedInUSD = useEthToUSD(vouchStats?.staked.received ?? 0);

  return (
    <Card
      bordered={false}
      css={css`
        ${contributorModeCard}
        width: ${cardWidth};
      `}
      styles={{
        body: {
          padding: 0,
        },
      }}
    >
      <Flex vertical>
        <Flex gap={20} css={{ padding: 20 }}>
          <UserAvatar actor={connectedActor} showScore={false} showHoverCard={false} size={64} />
          <Flex vertical gap={6}>
            <PersonName
              target={connectedActor}
              weight="bold"
              color="colorPrimary"
              showProfilePopover={false}
            />
            <Flex gap={6}>
              <ReviewFilled />
              {reviewStats?.received ? (
                <Typography.Text type="secondary">
                  <strong>{(reviewStats?.positiveReviewPercentage ?? 0).toFixed(0)}%</strong>{' '}
                  positive ({reviewStats?.received ?? 0})
                </Typography.Text>
              ) : (
                <Typography.Text type="secondary">No reviews</Typography.Text>
              )}
            </Flex>
            <Flex gap={6}>
              <VouchFilled />
              {vouchStats?.count.received ? (
                <Typography.Text type="secondary" ellipsis>
                  {vouchedInUSD ?? formatEth(vouchStats?.staked.received ?? 0, 'eth')} vouched (
                  {vouchStats?.count.received ?? 0})
                </Typography.Text>
              ) : (
                <Typography.Text type="secondary">No vouches</Typography.Text>
              )}
            </Flex>
            <Flex gap={6} align="center">
              <EthosStar css={{ fontSize: 16 }} />
              <Typography.Text type="secondary" ellipsis>
                {xpTotal} XP
              </Typography.Text>
            </Flex>
          </Flex>
        </Flex>

        <Flex
          vertical
          gap={12}
          align="center"
          css={{
            padding: 20,
            borderTop: `1px solid ${tokenCssVars.colorFill}`,
          }}
        >
          <Typography.Text
            type="secondary"
            css={{
              fontSize: 16,
            }}
          >
            New Contributor XP total
          </Typography.Text>
          <Flex gap={10} align="center">
            <Typography.Title
              level={2}
              css={{
                fontSize: 66,
                lineHeight: 1,
                color: tokenCssVars.colorSuccess,
              }}
            >
              {xpTotal}
            </Typography.Title>
            <EthosStar css={{ fontSize: 66, color: tokenCssVars.colorSuccess }} />
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}
