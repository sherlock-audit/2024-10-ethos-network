// eslint-disable-next-line no-restricted-imports
import { echoUrlMap } from '@ethos/env/src';

/**
 * The URL for the Ethos API.
 */

export const ETHOS_API_URL =
  (import.meta.env.VITE_ECHO_API_URL as string) ??
  (import.meta.env.DEV ? echoUrlMap.dev : echoUrlMap.testnet);

export const HISTORY_STATE_UPDATED = 'HISTORY_STATE_UPDATED';
