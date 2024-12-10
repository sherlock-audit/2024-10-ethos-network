import { formatEth, formatNumber, isAddressEqualSafe, isValidAddress } from '@ethos/helpers';
import { type LoaderFunctionArgs } from '@remix-run/node';
import { Await, useLoaderData } from '@remix-run/react';
import { Flex, List, Typography } from 'antd';
import { Suspense } from 'react';
import { ActivityListItem, ActivityListSkeleton } from './activity-list-item.component.tsx';
import { ProfileCard } from './profile-card.component.tsx';
import { StatCard } from './state-card.component.tsx';
import { MarketLogo } from '~/components/market-logo.tsx';
import { getPrivyUser } from '~/middleware.server/get-privy-user.ts';
import {
  getHoldingsTotalByAddress,
  getMarketVolumeTradedByAddress,
} from '~/services.server/echo.ts';
import { getMarketActivityByAddress } from '~/services.server/market-activity.ts';
import { getMarketUserByAddress } from '~/services.server/users.ts';

export async function loader({ params, request }: LoaderFunctionArgs) {
  if (!isValidAddress(params.address)) {
    throw new Response('Profile not found', {
      status: 404,
      statusText: 'Not Found',
    });
  }

  const [profile, activities, privyUser, volumeTraded, holdingsTotal] = await Promise.all([
    getMarketUserByAddress(params.address),
    getMarketActivityByAddress({
      address: params.address,
      pagination: { limit: 10 },
    }),
    getPrivyUser(request),
    getMarketVolumeTradedByAddress(params.address),
    getHoldingsTotalByAddress(params.address),
  ]);

  if (!profile) {
    throw new Response('Profile not found', {
      status: 404,
      statusText: 'Not Found',
    });
  }

  const isCurrentUser =
    isValidAddress(privyUser?.embeddedWallet) &&
    isValidAddress(profile.address) &&
    isAddressEqualSafe(privyUser.embeddedWallet, profile.address);

  return { activities, profile, isCurrentUser, volumeTraded, holdingsTotal };
}

export default function ProfileRoute() {
  const { activities, profile, isCurrentUser, volumeTraded, holdingsTotal } =
    useLoaderData<typeof loader>();

  return (
    <div className="w-full lg:mx-16 min-h-screen flex flex-col gap-6">
      <Flex vertical gap={16}>
        <Typography.Title level={2}>Profile</Typography.Title>
        <Flex gap={16} className="flex-wrap lg:flex-nowrap">
          <ProfileCard profile={profile} />
          <Flex gap={16} flex={1}>
            <StatCard
              title="Holdings"
              value={formatEth(holdingsTotal.totalValue, 'wei', {
                minimumFractionDigits: 2,
              })}
            />
            <StatCard
              title="Volume traded"
              value={formatNumber(volumeTraded.totalVolume, {
                notation: 'compact',
                maximumFractionDigits: 2,
                compactDisplay: 'short',
              })}
            />
          </Flex>
        </Flex>
      </Flex>

      <Flex vertical gap={16}>
        <Flex justify="space-between" align="bottom">
          <Typography.Title level={3}>Activity</Typography.Title>
          <MarketLogo />
        </Flex>
        <Suspense fallback={<ActivityListSkeleton />}>
          <Await resolve={activities}>
            {(activities) => (
              <List
                dataSource={activities.values}
                className="[&_ul]:m-0 [&_ul]:p-0"
                renderItem={(activity) => (
                  <ActivityListItem
                    key={activity.txHash.toString()}
                    activity={activity}
                    profile={profile}
                    isCurrentUser={isCurrentUser}
                    showAvatarLink={false}
                  />
                )}
              />
            )}
          </Await>
        </Suspense>
      </Flex>
    </div>
  );
}
