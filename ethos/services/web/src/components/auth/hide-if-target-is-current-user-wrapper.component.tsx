import { type EthosUserTarget } from '@ethos/domain';
import { type PropsWithChildren, type ReactNode } from 'react';
import { useIsTargetCurrentUser } from 'contexts/current-user.context';

export function HideIfTargetIsCurrentUserWrapper({
  target,
  children,
}: PropsWithChildren<{
  target: EthosUserTarget;
}>): ReactNode {
  const isTargetConnectedUser = useIsTargetCurrentUser(target);

  if (isTargetConnectedUser) {
    return null;
  }

  return children;
}
