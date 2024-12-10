import { type AvatarComponent } from '@rainbow-me/rainbowkit';
import { zeroAddress } from 'viem';
import { UserAvatar } from '../avatar/avatar.component';
import { useCurrentUser } from 'contexts/current-user.context';
import { useActor } from 'hooks/user/activities';

export function CustomAvatar({ size }: React.ComponentProps<AvatarComponent>) {
  const { connectedAddress } = useCurrentUser();
  const connectedTarget = { address: connectedAddress ?? zeroAddress };
  const user = useActor(connectedTarget);

  return (
    <UserAvatar
      actor={user}
      renderAsLink={false}
      size={size}
      showHoverCard={false}
      showScore={false}
    />
  );
}
