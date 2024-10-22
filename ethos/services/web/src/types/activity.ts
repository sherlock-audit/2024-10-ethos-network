import { type ActivityActor } from '@ethos/domain';

// eslint-disable-next-line no-restricted-imports
export { type BulkVotes } from '../../../echo/src/services/activity/bulk.votes';

export type PageDestination = 'profile';

export type Actor = Pick<
  ActivityActor,
  'avatar' | 'name' | 'score' | 'userkey' | 'username' | 'primaryAddress'
>;
