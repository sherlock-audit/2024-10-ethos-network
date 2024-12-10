import { type PropsWithChildren, type ReactNode } from 'react';
import { useIsPWA } from 'hooks/use-is-pwa';

export function ExcludePwaMiddleware({ children }: PropsWithChildren): ReactNode {
  const isPwa = useIsPWA();

  if (isPwa) {
    return null;
  }

  return children;
}
