import { webUrlMap } from '@ethos/env';
import { config } from '~/config/config.server.ts';

export function fallbackAvatarUrl(userkey: string) {
  return new URL(`/avatar/blockie/${userkey}`, webUrlMap[config.ETHOS_ENV]).toString();
}
