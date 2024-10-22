import { identity } from './identity';
import { profile } from './profile';

export const user = {
  ...profile,
  ...identity,
};
