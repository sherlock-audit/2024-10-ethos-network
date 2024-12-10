import { type ActivityActor } from '@ethos/domain';
import { type useScoreSimulation } from 'hooks/user/lookup';

// eslint-disable-next-line no-restricted-imports
export { type BulkVotes } from '../../../echo/src/services/activity/bulk.votes.service';

export type PageDestination = 'profile';

export type Actor = Pick<
  ActivityActor,
  'avatar' | 'name' | 'score' | 'userkey' | 'username' | 'primaryAddress'
>;

export type ScoreSimulationResult = ReturnType<typeof useScoreSimulation>['data'];
