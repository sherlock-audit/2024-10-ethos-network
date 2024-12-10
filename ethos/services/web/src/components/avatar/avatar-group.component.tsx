import { type EthosUserTarget } from '@ethos/domain';
import { Avatar, Skeleton } from 'antd';
import { type GroupProps } from 'antd/es/avatar';
import { UserAvatar } from './avatar.component';
import { useActivityActorsBulk } from 'hooks/user/activities';

type Props = {
  targets: EthosUserTarget[];
} & GroupProps;

export function UserAvatarGroup({ targets, ...props }: Props) {
  const { data: actors, isLoading } = useActivityActorsBulk(targets);

  return (
    <Avatar.Group {...props}>
      {isLoading ? (
        <Skeleton.Input size="small" active />
      ) : (
        (actors ?? [])?.map((actor) => (
          <UserAvatar key={actor.userkey} actor={actor} size="small" />
        ))
      )}
    </Avatar.Group>
  );
}
