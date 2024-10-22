import { css } from '@emotion/react';
import { DEFAULT_STARTING_SCORE, type EthosUserTarget } from '@ethos/domain';
import { formatEth } from '@ethos/helpers';
import { Card, Flex, Typography } from 'antd';
import { zeroAddress } from 'viem';
import { UserAvatar } from 'components/avatar/avatar.component';
import { Logo, ReviewFilled, VouchFilled } from 'components/icons';
import { PersonName } from 'components/person-name/person-name.component';
import { useCurrentUser } from 'contexts/current-user.context';
import { useEthToUSD } from 'hooks/api/eth-to-usd-rate.hook';
import { useReviewStats, useVouchStats } from 'hooks/user/lookup';
import { useScoreGraph } from 'utils/score-graph/use-score-graph';
import { useScoreCategory } from 'utils/scoreCategory';

export function FeedProfileCard() {
  const { connectedProfile, connectedActor } = useCurrentUser();

  const connectedUserTarget: EthosUserTarget | null = connectedProfile
    ? { profileId: connectedProfile.id }
    : null;

  const reviewStats = useReviewStats(connectedUserTarget ?? { address: zeroAddress }).data;
  const vouchStats = useVouchStats(connectedUserTarget ?? { address: zeroAddress }).data;

  const vouchedInUSD = useEthToUSD(vouchStats?.staked.received ?? 0);
  const { score } = connectedActor;

  const [scoreCategory] = useScoreCategory(score || DEFAULT_STARTING_SCORE);
  const scoreGraphUrl = useScoreGraph(connectedUserTarget ?? { address: zeroAddress });

  return (
    <Card
      css={css`
        background-image: url(${scoreGraphUrl});
        background-position: bottom center;
        background-size: 101% 57%;
        background-repeat: no-repeat;
        background-position: bottom -1px center;
        margin-top: 57px;
      `}
    >
      <Flex vertical gap={24}>
        <Flex gap={12}>
          <UserAvatar actor={connectedActor} showScore={false} showHoverCard={false} />
          <Flex vertical gap={4}>
            <PersonName
              target={connectedActor}
              weight="bold"
              color="colorPrimary"
              showProfilePopover={false}
            />
            <Flex gap={4}>
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
            <Flex gap={4}>
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
          </Flex>
        </Flex>

        <Flex vertical gap={4} align="flex-end">
          <Flex gap={10} align="center">
            <Typography.Title
              level={2}
              css={css`
                font-size: 52px;
                line-height: 26px;
                color: ${scoreCategory.color};
                margin-bottom: 0;
              `}
            >
              {score}
            </Typography.Title>
            <Logo
              css={css`
                font-size: 35px;
                color: ${scoreCategory.color};
              `}
            />
          </Flex>
          <Typography.Title
            css={css`
              color: ${scoreCategory.color};
              text-transform: capitalize;
              line-height: 32px;
              font-size: 24px;
              font-family: var(--font-queens), sans-serif !important;
              margin-top: 0;
            `}
            level={2}
          >
            {scoreCategory.status}
          </Typography.Title>
        </Flex>
      </Flex>
    </Card>
  );
}
