import { type PropsWithChildren, type ReactNode } from 'react';
import { useIsExternalReferer } from 'hooks/use-is-external-referer';

export function ExternalReferrerRequiredWrapper({ children }: PropsWithChildren): ReactNode {
  const isExternalReferer = useIsExternalReferer();

  if (!isExternalReferer) {
    return null;
  }

  return children;
}
