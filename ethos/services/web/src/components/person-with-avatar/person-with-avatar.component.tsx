import { type EthosUserTarget } from '@ethos/domain';
import { Flex } from 'antd';
import { memo } from 'react';
import { UserAvatar } from '../avatar/avatar.component';
import { PersonName } from '../person-name/person-name.component';
import { useActor } from 'hooks/user/activities';

type Props = {
  target: EthosUserTarget;
  avatarSize?: 'small' | 'default' | 'large';
  linkColor?: 'colorText' | 'colorTextSecondary' | 'colorPrimary';
  nameSize?: 'default' | 'large';
  showName?: boolean;
};

export const PersonWithAvatar = memo(function PersonWithAvatar({
  target,
  avatarSize = 'default',
  linkColor = 'colorText',
  showName = true,
  nameSize = 'default',
}: Props) {
  const actor = useActor(target);

  // When avatar is small, there's no score associated with it so we can make the gap between avatar and name smaller
  const nameAvatarGap = avatarSize === 'small' ? 8 : 16;

  return (
    <Flex align="center" gap={nameAvatarGap}>
      <UserAvatar actor={actor} size={avatarSize} />
      {showName && <PersonName target={actor} weight="default" color={linkColor} size={nameSize} />}
    </Flex>
  );
});
