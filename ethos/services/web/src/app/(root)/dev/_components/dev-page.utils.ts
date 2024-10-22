import { getEnvironment } from 'config';

export function isDevPageEnabled() {
  return ['local', 'dev'].includes(getEnvironment());
}
