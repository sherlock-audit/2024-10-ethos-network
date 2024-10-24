import { isValidAddress } from '@ethos/helpers';
import { getBlockieUrl } from 'hooks/user/lookup';

export function getAvatar(avatar: string | null, address: string | null) {
  if (avatar) return avatar;

  if (address && isValidAddress(address)) return getBlockieUrl(address);

  return null;
}
