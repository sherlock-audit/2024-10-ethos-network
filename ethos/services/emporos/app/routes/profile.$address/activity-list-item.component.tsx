import { Link } from '@remix-run/react';
import { Flex, List, Skeleton, Typography } from 'antd';
import { MarketUserAvatar } from '~/components/avatar/user-avatar.component.tsx';
import { RelativeDateTime } from '~/components/relative-time.component.tsx';
import { TransactionIcon } from '~/components/transact-form/tx-icon.tsx';
import { type ProfileActivity } from '~/types/activity.ts';
import { type MarketUser } from '~/types/user.ts';

export function ActivityListItem({
  activity,
  profile,
  isCurrentUser,
  showAvatarLink = true,
}: {
  activity: ProfileActivity;
  profile: MarketUser;
  isCurrentUser: boolean;
  showAvatarLink?: boolean;
}) {
  const cardName = isCurrentUser ? 'You' : profile.name;

  return (
    <List.Item className="px-4 py-3 border-b border-borderSecondary list-none m-0 p-0">
      <Flex align="center" className="w-full" gap={16}>
        <MarketUserAvatar
          address={profile.address}
          avatarUrl={profile.avatarUrl}
          size="xs"
          ethosScore={profile.ethosInfo.score}
          showLink={showAvatarLink}
        />
        <Flex vertical gap={4}>
          <Typography.Text>
            {cardName} {activity.voteType === 'trust' ? 'bought' : 'sold'}{' '}
            <Typography.Text
              strong
              className={activity.voteType === 'trust' ? 'text-trust' : 'text-distrust'}
            >
              {activity.votes} {activity.voteType}
            </Typography.Text>{' '}
            for{' '}
            <Link to={`/market/${activity.marketId}`} className="font-bold">
              {activity.market.name}
            </Link>
          </Typography.Text>
          <Flex align="center" gap={4} className="text-xs/none text-antd-colorTextSecondary">
            <RelativeDateTime timestamp={activity.timestamp} verbose />
            <TransactionIcon
              hash={activity.txHash.toString()}
              className="text-base/none text-inherit hover:opacity-80"
            />
          </Flex>
        </Flex>
      </Flex>
    </List.Item>
  );
}

export function ActivityListSkeleton() {
  return (
    <List
      dataSource={Array.from({ length: 6 }, (_, i) => i)}
      className="[&_ul]:m-0 [&_ul]:p-0"
      renderItem={(index) => (
        <List.Item
          key={index}
          className="px-4 py-3 border-b border-borderSecondary list-none m-0 p-0"
        >
          <Flex align="center" className="w-full" gap={16}>
            <Skeleton.Avatar active size="large" />
            <Skeleton.Input active size="large" className="w-full md:w-[70%]" />
          </Flex>
        </List.Item>
      )}
    />
  );
}
