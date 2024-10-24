import { SlidersOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { type LiteProfile } from '@ethos/domain';
import { formatEth } from '@ethos/helpers';
import { Avatar, Button, Card, Flex, List, Skeleton, Tag, Tooltip, Typography } from 'antd';
import { MarketCapLabel } from './market-cap.component';
import { RelativeDateTime } from 'components/RelativeDateTime';
import { UserAvatarGroup } from 'components/avatar/avatar-group.component';
import { tokenCssVars } from 'config';
import { useCurrentUser } from 'contexts/current-user.context';
import { useWeiToUSD } from 'hooks/api/eth-to-usd-rate.hook';
import { useCreateMarket, useMyVotes, votePriceToPercentage } from 'hooks/market/market.hooks';
import { useIsCurrentTargetUser } from 'hooks/user/utils';
import { type echoApi } from 'services/echo';

type Props = {
  isLoading: boolean;
  market?: Awaited<ReturnType<typeof echoApi.markets.info>>;
  profile?: LiteProfile | null;
};

export function MarketInfo({ isLoading, market, profile }: Props) {
  const card = profile ? (
    <MarketInfoCard market={market} isLoading={isLoading} profile={profile} />
  ) : (
    <ProfileRequired />
  );

  return (
    <Card
      css={css`
        height: 100%;
        box-shadow: ${tokenCssVars.boxShadowTertiary};

        & .ant-card-body {
          height: 100%;
        }
      `}
    >
      <Flex
        gap={10}
        vertical
        css={css`
          height: 100%;
        `}
      >
        <Flex gap={6}>
          <Avatar
            css={css`
              background-color: transparent;
            `}
            size="small"
            icon={
              <SlidersOutlined
                css={css`
                  font-size: 14px;
                  padding-top: 1px;
                  color: ${tokenCssVars.colorText};
                  background-color: transparent;
                `}
              />
            }
          />
          <Typography.Title level={5}>Market info</Typography.Title>
        </Flex>
        {card}
      </Flex>
    </Card>
  );
}

function ProfileRequired() {
  return (
    <Typography.Text strong>Reputation markets are only available for Ethos users.</Typography.Text>
  );
}

function MarketInfoCard({ market, isLoading, profile }: Props) {
  const { isConnected } = useCurrentUser();
  const isCurrentUser = useIsCurrentTargetUser({ profileId: profile?.id ?? 0 });
  const { data: myVotes, isLoading: isMyVotesLoading } = useMyVotes(market?.profileId ?? 0);
  const ownedByTotalWei =
    myVotes && market
      ? BigInt(myVotes.trustVotes ?? 0) * BigInt(market.positivePrice ?? 0n) +
        BigInt(myVotes.distrustVotes ?? 0) * BigInt(market.negativePrice ?? 0n)
      : 0n;

  const ownedByTotalUsd = useWeiToUSD(ownedByTotalWei ?? 0n);

  // market actions
  const createMarket = useCreateMarket();
  const handleCreateMarket = async () => {
    if (!profile) return;
    await createMarket.mutateAsync({
      profileId: profile.id,
      value: BigInt(2000000000000000),
    });
  };

  return (
    <List
      dataSource={[
        {
          label: 'Trust voting',
          value: market ? (
            <Tag
              color={tokenCssVars.colorBgLayout}
              css={css`
                color: ${tokenCssVars.colorSuccess};
                text-align: right;
                margin-right: 0;
              `}
            >
              {votePriceToPercentage(BigInt(market.positivePrice))}
            </Tag>
          ) : isCurrentUser ? (
            <Button
              type="primary"
              size="small"
              ghost
              onClick={handleCreateMarket}
              disabled={!isConnected}
            >
              Create market
            </Button>
          ) : (
            <Typography.Text strong>N/A</Typography.Text>
          ),
        },
        {
          label: 'Market cap',
          value: (
            <Typography.Text strong>
              {isLoading ? (
                <Skeleton.Input size="small" active />
              ) : market ? (
                <MarketCapLabel marketCap={market.marketCap} />
              ) : (
                <Typography.Text strong>N/A</Typography.Text>
              )}
            </Typography.Text>
          ),
        },
        {
          label: `Participants (${market?.participants.length ?? 0})`,
          value: (
            <UserAvatarGroup
              targets={market ? market.participants.map((p) => ({ address: p })) : []}
              max={{
                count: market?.participants.length ?? 0,
                style: {
                  color: tokenCssVars.colorPrimary,
                  backgroundColor: tokenCssVars.colorBgLayout,
                },
              }}
            />
          ),
        },
        {
          label: 'Created',
          value: (
            <Flex gap={4}>
              <Typography.Text type="secondary">
                {market ? (
                  <RelativeDateTime
                    dateTimeFormat={{ dateStyle: 'long', timeStyle: 'short' }}
                    timestamp={market.createdAt}
                  />
                ) : (
                  <Typography.Text strong>N/A</Typography.Text>
                )}
              </Typography.Text>
            </Flex>
          ),
        },
        {
          label: 'Owned by profile',
          value: (
            <Typography.Text strong>
              {isMyVotesLoading ? (
                <Skeleton.Input size="small" />
              ) : (
                <Tooltip title={formatEth(ownedByTotalWei, 'wei')}>{ownedByTotalUsd}</Tooltip>
              )}
            </Typography.Text>
          ),
        },
      ]}
      renderItem={({ label, value }) => (
        <List.Item
          key={label}
          css={css`
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            height: 24px;

            &:not(:last-child) {
              margin-bottom: 24px;
            }
          `}
        >
          <Typography.Text type="secondary">{label}</Typography.Text>
          <Typography.Text>{value}</Typography.Text>
        </List.Item>
      )}
    />
  );
}
