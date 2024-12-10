import { themes, type EthosTheme } from '@ethos/common-ui';
import { useRouteLoaderData } from '@remix-run/react';
import { type loader as rootLoader } from '~/root.tsx';

export function isThemeValid(value: unknown): value is EthosTheme {
  return typeof value === 'string' && themes.some((theme) => theme === value);
}

/**
 * @returns the request info from the root loader
 */
export function useRequestInfo() {
  const data = useRouteLoaderData<typeof rootLoader>('root');

  return data?.requestInfo;
}

/**
 * @returns the user's theme preference, or the client hint theme if the user
 * has not set a preference.
 */
export function useTheme() {
  const requestInfo = useRequestInfo();

  return requestInfo?.userPrefs.theme ?? requestInfo?.hints.theme ?? 'light';
}
