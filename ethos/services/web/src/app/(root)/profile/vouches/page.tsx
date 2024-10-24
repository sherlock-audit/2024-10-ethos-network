'use client';

import { css } from '@emotion/react';
import { formatEth } from '@ethos/helpers';
import { Col, Flex, Row, Tabs, Button, theme, Space, Tooltip } from 'antd';
import { zeroAddress } from 'viem';
import { StatusCard } from './_components/stats-card.component';
import { VouchHistory } from './_components/vouch-history.component';
import { VouchesList } from './_components/vouches-list.component';
import { AuthRequiredWrapper } from 'components/auth/auth-required-wrapper.component';
import { BasicPageWrapper } from 'components/basic-page-wrapper/basic-page-wrapper.component';
import { VouchFilled, RewardFilled } from 'components/icons';
import { tokenCssVars } from 'config';
import { useCurrentUser } from 'contexts/current-user.context';
import { useClaimVouchRewards } from 'hooks/api/blockchain-manager';
import { useEthToUSD } from 'hooks/api/eth-to-usd-rate.hook';
import { useVouchRewards, useVouchStats } from 'hooks/user/lookup';

export default function ProfileVouches() {
  const { connectedAddress, connectedProfile } = useCurrentUser();
  const claimVouchRewards = useClaimVouchRewards();
  const target = { address: connectedAddress ?? zeroAddress };
  const { token } = theme.useToken();

  const { data: vouchStats, isPending: isVouchStatsPending } = useVouchStats(target);
  const { data: vouchRewards, isPending: isVouchRewardsPending } = useVouchRewards(target);
  const items = [
    {
      key: 'active-vouches',
      label: 'Active Vouches',
      children: connectedProfile && <VouchesList profileId={connectedProfile.id} />,
    },
    {
      key: 'vouch-history',
      label: 'History',
      children: <VouchHistory target={target} />,
    },
  ];

  const currentBalance = {
    eth: Number(vouchStats?.balance.deposited) || 0,
    usd: useEthToUSD(Number(vouchStats?.balance.deposited) || 0),
  };
  const rewardsBalance = {
    eth: Number(vouchRewards?.rewards) || 0,
    usd: useEthToUSD(Number(vouchRewards?.rewards) || 0),
  };
  const lifetimeRewards = {
    eth: Number(vouchRewards?.lifetime) || 0,
    usd: useEthToUSD(Number(vouchRewards?.lifetime) || 0),
  };

  return (
    <BasicPageWrapper title="Vouch balances">
      <AuthRequiredWrapper>
        <Flex vertical gap={20}>
          <Row
            gutter={20}
            css={css`
              @media (max-width: ${token.screenLG}px) {
                gap: 20px;
              }
            `}
          >
            <Col xs={{ span: 24 }} lg={{ span: 8 }}>
              <StatusCard
                tooltipText="Vouch balance represents the total of all the vouches you have in other people in Ethos."
                icon={<VouchFilled />}
                bottomContent="Vouch Balance"
                title={formatCardTitle(currentBalance.usd)}
                value={`${formatEth(currentBalance.eth, 'eth')}`}
                isLoading={isVouchStatsPending}
              />
            </Col>
            <Col xs={{ span: 24 }} lg={{ span: 8 }}>
              <StatusCard
                title={formatCardTitle(rewardsBalance.usd)}
                value={formatEth(rewardsBalance.eth, 'eth')}
                tooltipText={`Vouch rewards are received when you are vouched by a user. Your lifetime awards are ${formatEth(lifetimeRewards.eth, 'eth')} (${lifetimeRewards.usd})`}
                icon={<RewardFilled />}
                isLoading={isVouchRewardsPending}
                bottomContent={
                  <Space align="center" size={5}>
                    Vouch Rewards
                    <Tooltip
                      title={
                        rewardsBalance.eth === 0
                          ? 'No rewards to claim'
                          : 'Claim your vouch rewards'
                      }
                    >
                      <Button
                        type="link"
                        css={css`
                          padding: 0;
                          height: fit-content;
                          line-height: normal;
                          color: ${tokenCssVars.colorPrimary};
                        `}
                        onClick={async () => {
                          try {
                            if (rewardsBalance.eth === 0) {
                              return;
                            }
                            await claimVouchRewards.mutateAsync();
                          } catch {} // There’s no need to handle this exception, as mutateAsync will display errors in a toast.
                        }}
                      >
                        Claim
                      </Button>
                    </Tooltip>
                  </Space>
                }
              />
            </Col>
          </Row>
          <Tabs
            defaultActiveKey="active-vouches"
            items={items}
            css={css`
              .ant-tabs-nav {
                margin-bottom: 24px !important;
              }
            `}
          />
        </Flex>
      </AuthRequiredWrapper>
    </BasicPageWrapper>
  );
}

function formatCardTitle(amount: string | null) {
  return amount ?? '-';
}
