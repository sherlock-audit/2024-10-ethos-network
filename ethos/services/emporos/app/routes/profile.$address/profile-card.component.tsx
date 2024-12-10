import { webUrlMap } from '@ethos/env';
import { formatDate } from '@ethos/helpers';
import { Link } from '@remix-run/react';
import { Button, Card, Flex, Typography } from 'antd';
import { MarketUserAvatar } from '~/components/avatar/user-avatar.component.tsx';
import { CalendarMonthIcon } from '~/components/icons/calendar-month.tsx';
import { TwitterXIcon } from '~/components/icons/twitter-x.tsx';
import { useEnvironment } from '~/hooks/env.tsx';
import { type MarketUser } from '~/types/user.ts';

export function ProfileCard({ profile }: { profile: MarketUser }) {
  const usernameClean = profile.username.startsWith('@')
    ? profile.username.slice(1)
    : profile.username;

  const formattedDate = profile.createdDate
    ? formatDate(profile.createdDate, { month: 'short', year: 'numeric' })
    : null;

  const environment = useEnvironment();
  const ethosProfileLink = `${webUrlMap[environment]}/profile/${profile?.address}`;

  return (
    <Card className="w-full md:w-auto">
      <Flex vertical gap={12} align="flex-start">
        <Flex align="center" justify="center" gap={16}>
          <MarketUserAvatar
            avatarUrl={profile.avatarUrl}
            size={48}
            ethosScore={profile.ethosInfo.score}
            address={profile.address}
            showLink={false}
          />
          <Flex vertical gap={4}>
            <Typography.Text className="text-base">{profile.name}</Typography.Text>
            <Flex gap={8} align="center">
              <Link
                to={`https://x.com/${usernameClean}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-antd-colorTextSecondary hover:text-antd-colorLink"
              >
                <TwitterXIcon className="text-base/none" />
                <span className="text-xs/none">{usernameClean}</span>
              </Link>
              {formattedDate && (
                <Flex
                  align="center"
                  gap={4}
                  className="text-antd-colorTextSecondary whitespace-nowrap"
                >
                  <CalendarMonthIcon className="text-base/none" />
                  <span className="text-xs/none">{formattedDate}</span>
                </Flex>
              )}
            </Flex>
          </Flex>
        </Flex>
        <Button type="primary" href={ethosProfileLink} target="_blank" className="self-stretch">
          View profile in Ethos network
        </Button>
      </Flex>
    </Card>
  );
}
