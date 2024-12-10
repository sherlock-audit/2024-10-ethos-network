import { identity } from './identity.js';
import { profile } from './profile.js';

export const user = {
  ...profile,
  ...identity,
};
