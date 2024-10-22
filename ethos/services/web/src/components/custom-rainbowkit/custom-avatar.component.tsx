import { type AvatarComponent } from '@rainbow-me/rainbowkit';
import { type Address, isAddress, zeroAddress } from 'viem';
import { UserAvatar } from '../avatar/avatar.component';
import { useActor } from 'hooks/user/activities';

export function CustomAvatar({ address, ensImage, size }: React.ComponentProps<AvatarComponent>) {
  const validAddress: Address = isAddress(address) ? address : zeroAddress;
  const { name, avatar } = useActor({ address: validAddress });

  return (
    <UserAvatar
      actor={{
        name,
        avatar: ensImage ?? avatar ?? null,
        userkey: '',
        score: 0,
        primaryAddress: zeroAddress,
      }}
      renderAsLink={false}
      size={size}
      showHoverCard={false}
    />
  );
}
