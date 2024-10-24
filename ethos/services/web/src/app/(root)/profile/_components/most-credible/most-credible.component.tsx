'use client';
import { css } from '@emotion/react';
import { type EthosUserTarget } from '@ethos/domain';
import { Flex, Typography, Card, theme, Avatar, Skeleton, List } from 'antd';
import { Voucher } from './voucher.component';
import { Crowd } from 'components/icons';
import { LottieLoader } from 'components/loading-wrapper/lottie-loader.component';
import { tokenCssVars } from 'config';
import { useGetVouchersByCredibility } from 'hooks/user/hooks';
import { useProfile } from 'hooks/user/lookup';

const { Title } = Typography;
const { useToken } = theme;

type Props = {
  target?: EthosUserTarget;
};

export function MostCredibleVouchers({ target }: Props) {
  const { token } = useToken();
  const profileId = useProfile(target ?? { profileId: -1 }).data?.id ?? -1;
  const { data: credibleVouchers, isPending } = useGetVouchersByCredibility(profileId);
  const credibles = credibleVouchers ?? [];
  const data = credibles.map((vouch) => (
    <Voucher key={vouch.vouchId} author={vouch.authorProfileId} vouchId={vouch.vouchId} />
  ));

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
        <Flex gap={6} align="center">
          <Avatar
            css={css`
              background-color: transparent;
            `}
            size="small"
            icon={
              <Crowd
                css={css`
                  font-size: ${token?.Avatar?.containerSizeSM}px;
                  color: ${tokenCssVars.colorText};
                `}
              />
            }
          />
          <Title level={5}>Most credible vouchers</Title>
        </Flex>

        {isPending ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <List
            dataSource={data}
            locale={{
              emptyText: 'No vouchers',
            }}
            loading={{ spinning: isPending, indicator: <LottieLoader size={24} /> }}
            renderItem={(item) => <List.Item>{item}</List.Item>}
          />
        )}
      </Flex>
    </Card>
  );
}
