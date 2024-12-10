import { type Profile } from '@ethos/blockchain-manager';
import { invitationAcceptedActivity } from '@ethos/domain';
import { Flex, List, Typography } from 'antd';
import Link from 'next/link';
import { RelativeDateTime } from 'components/RelativeDateTime';
import { UserAvatar } from 'components/avatar/avatar.component';
import { PersonName } from 'components/person-name/person-name.component';
import { useActor } from 'hooks/user/activities';
import { getActivityUrl } from 'utils/routing';

const { Text } = Typography;

export function InvitationItem({
  profile,
  onItemClick,
}: {
  profile: Profile;
  onItemClick?: () => void;
}) {
  const author = useActor({ profileId: profile.id });

  return (
    <Link
      href={getActivityUrl({
        type: invitationAcceptedActivity,
        data: profile,
      })}
      onClick={onItemClick}
    >
      <List.Item extra={<RelativeDateTime timestamp={profile.createdAt} />}>
        <List.Item.Meta
          avatar={<UserAvatar actor={author} />}
          title={
            <Flex gap={5}>
              <PersonName target={author} />
              <Text>accepted your invitation!</Text>
            </Flex>
          }
        />
      </List.Item>
    </Link>
  );
}
