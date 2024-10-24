'use client';
import { css } from '@emotion/react';
import { toUserKey } from '@ethos/domain';
import { formatEth } from '@ethos/helpers';
import { Avatar, Card, Flex, Progress, Space, theme, Tooltip, Typography } from 'antd';
import { UserAvatar } from 'components/avatar/avatar.component';
import {
  Groups,
  InviteFilled,
  People,
  ReviewFilled,
  UserSearch,
  VouchFilled,
} from 'components/icons';
import { ProfileReviewScoreTag } from 'components/profile-review-score-tag/profile-review-score-tag.component';
import { tokenCssVars } from 'config';
import { useEthToUSD } from 'hooks/api/eth-to-usd-rate.hook';
import { type ActivityActor } from 'services/echo';

const { Text, Title } = Typography;
const { useToken } = theme;

type Props = {
  positiveReviewsPercentage: number;
  reviewsPercentile: number;
  numReviews: number;
  vouched: number;
  vouchedPercentile: number;
  numVouched: number;
  vouchedInOthers: number;
  vouchedInOthersPercentile: number;
  acceptedActors: ActivityActor[];
  mutualVouchers: ActivityActor[];
  mutualVouchersPercentile: number;
  mutualVouchersVisible: boolean;
};

export function Highlights({
  positiveReviewsPercentage,
  reviewsPercentile,
  numReviews,
  vouched,
  vouchedPercentile,
  numVouched,
  vouchedInOthers,
  vouchedInOthersPercentile,
  acceptedActors,
  mutualVouchers,
  mutualVouchersVisible,
}: Props) {
  const { token } = useToken();
  const vouchedForInUSD = useEthToUSD(vouched);
  const vouchedInOthersInUSD = useEthToUSD(vouchedInOthers);

  const iconClassName = css`
    color: ${tokenCssVars.colorTextSecondary};
  `;

  const mostCredibleUsersData = [
    {
      name: 'Reviews' + (numReviews > 0 ? ' (' + numReviews + ')' : ''),
      icon: <ReviewFilled css={iconClassName} />,
      value: (
        <ProfileReviewScoreTag
          numReviews={numReviews}
          positiveReviewsPercentage={positiveReviewsPercentage}
        />
      ),
      percent: reviewsPercentile,
    },
    {
      name: 'Vouched' + (numVouched > 0 ? ' (' + numVouched + ')' : ''),
      icon: <VouchFilled css={iconClassName} />,
      value: (
        <Tooltip title={`${vouched}e vouched`}>
          <Text strong>{vouchedForInUSD ?? formatEth(vouched, 'eth')}</Text>
        </Tooltip>
      ),
      percent: vouchedPercentile,
    },
    {
      name: 'Vouched in others',
      icon: <People css={iconClassName} />,
      value: (
        <Tooltip title={`${vouchedInOthers}e vouched in others`}>
          <Text strong>{vouchedInOthersInUSD ?? formatEth(vouchedInOthers, 'eth')}</Text>
        </Tooltip>
      ),
      percent: vouchedInOthersPercentile,
    },
    {
      name: 'Invited',
      icon: <InviteFilled css={iconClassName} />,
      value: acceptedActors.length && (
        <Avatar.Group
          max={{
            count: 2,
            style: {
              color: tokenCssVars.colorPrimary,
              backgroundColor: tokenCssVars.colorBgLayout,
            },
          }}
          size="small"
        >
          {acceptedActors.map((actor) => (
            <UserAvatar
              key={actor.userkey}
              actor={{ ...actor, userkey: toUserKey({ address: actor.primaryAddress }) }}
              size="small"
            />
          ))}
        </Avatar.Group>
      ),
    },
  ];

  if (mutualVouchersVisible) {
    mostCredibleUsersData.push({
      name: 'Mutual Vouchers',
      icon: <Groups css={iconClassName} />,
      value: mutualVouchers.length ? (
        <Avatar.Group
          max={{
            count: 2,
            style: {
              color: tokenCssVars.colorPrimary,
              backgroundColor: tokenCssVars.colorBgLayout,
            },
          }}
          size="small"
        >
          {mutualVouchers.map((actor) => (
            <UserAvatar
              key={actor.userkey}
              actor={{ ...actor, userkey: toUserKey({ address: actor.primaryAddress }) }}
              size="small"
            />
          ))}
        </Avatar.Group>
      ) : (
        <>None</>
      ),
    });
  }

  return (
    <Card
      css={css`
        height: 100%;
        box-shadow: ${tokenCssVars.boxShadowTertiary};
      `}
    >
      <Flex gap={22} vertical>
        <Flex gap={6} align="center">
          <Avatar
            css={css`
              background-color: transparent;
            `}
            size="small"
            icon={
              <UserSearch
                css={css`
                  font-size: ${token?.Avatar?.containerSizeSM}px;
                  color: ${tokenCssVars.colorText};
                `}
              />
            }
          />
          <Title level={5}>Highlights</Title>
        </Flex>

        {mostCredibleUsersData.map((item) => {
          const title = !item.percent
            ? undefined
            : item.percent >= 50
              ? `Top ${Math.max(1, 100 - item.percent).toFixed(0)}% of Ethos users`
              : `Bottom ${item.percent.toFixed(0)}% of Ethos users`;

          return (
            <Flex key={item.name} justify="space-between" align="center">
              <Space size={7}>
                <Tooltip title={title}>
                  <Progress
                    strokeWidth={8}
                    size={30}
                    strokeColor={tokenCssVars.colorTextSecondary}
                    type="circle"
                    percent={item.percent ?? 0}
                    strokeLinecap="square"
                    format={() => item.icon}
                  />
                </Tooltip>
                <Flex align="center">
                  <Text type="secondary">{item.name}</Text>
                </Flex>
              </Space>
              <Text strong>{item.value}</Text>
            </Flex>
          );
        })}
      </Flex>
    </Card>
  );
}
