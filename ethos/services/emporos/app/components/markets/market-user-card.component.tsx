import { Link } from '@remix-run/react';
import { Flex, Typography } from 'antd';
import { type PropsWithChildren } from 'react';
import { MarketUserAvatar } from '../avatar/user-avatar.component.tsx';
import { RelativeDateTime } from '../relative-time.component.tsx';
import { type MarketUser } from '~/types/user.ts';

export function MarketUserCard({ user }: PropsWithChildren<{ user: MarketUser }>) {
  return (
    <Link to={`/profile/${user.address}`} className="relative w-full">
      <Flex
        align="center"
        justify="space-between"
        gap={6}
        className="bg-antd-colorBgContainer rounded-lg p-3"
      >
        <Flex align="center" justify="left" gap={16}>
          <MarketUserAvatar
            avatarUrl={user.avatarUrl}
            ethosScore={user.ethosInfo.score}
            size="xs"
            address={user.address}
          />
          <Flex vertical justify="center" gap={4}>
            <Typography.Title level={5}>{user.username}</Typography.Title>
            <Flex align="center" justify="left" gap={12}>
              {user.createdDate && <RelativeDateTime timestamp={user.createdDate} />}
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Link>
  );
}
