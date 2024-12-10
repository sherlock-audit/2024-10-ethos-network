import { getEnvironment } from 'config/environment';

export function isDevPageEnabled() {
  return ['local', 'dev'].includes(getEnvironment());
}
