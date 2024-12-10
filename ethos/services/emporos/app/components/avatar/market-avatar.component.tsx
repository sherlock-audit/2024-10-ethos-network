import { Avatar, Flex } from 'antd';
import clsx from 'clsx';
import { PersonIcon } from '../icons/person.tsx';
import { type Market } from '~/types/markets.ts';

type AvatarProps = Pick<Market, 'avatarUrl'> & {
  size?: 'default' | 'small' | 'xs' | 'xxs' | number;
  rootClassName?: string;
};

export const AVATAR_SIZES: Record<NonNullable<AvatarProps['size']>, number> = {
  xxs: 30,
  xs: 40,
  small: 64,
  default: 80,
};

export function MarketAvatar({ avatarUrl, size = 'default', rootClassName }: AvatarProps) {
  return (
    <Flex align="center" gap={16} className={clsx('relative', rootClassName)}>
      <Avatar
        src={avatarUrl}
        shape="square"
        size={typeof size === 'number' ? size : AVATAR_SIZES[size]}
        icon={<PersonIcon />}
      />
    </Flex>
  );
}
