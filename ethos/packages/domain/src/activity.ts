import {
  type Attestation,
  type Profile,
  type ProfileId,
  type Review,
  type Vouch,
  type VouchFunds,
} from '@ethos/blockchain-manager';
import { type Address } from 'viem';
import { type BlockchainEvent } from './blockchain-event';
import { type ReplySummary } from './reply';
import { type Relationship } from './transaction';

export const attestationActivity = 'attestation';
export const invitationAcceptedActivity = 'invitation-accepted';
export const reviewActivity = 'review';
export const vouchActivity = 'vouch';
export const unvouchActivity = 'unvouch';

export const activities = [
  attestationActivity,
  invitationAcceptedActivity,
  reviewActivity,
  vouchActivity,
  unvouchActivity,
] as const;

export type ActivityType = (typeof activities)[number];

type ActivityInfoBase<T extends ActivityType, D extends Record<string, any>> = {
  type: T;
  data: D;
  timestamp: number;
  votes: VoteInfo;
  replySummary: ReplySummary;
  author: ActivityActor;
  subject: ActivityActor;
  events: BlockchainEvent[];
};

export type AttestationActivityInfo = ActivityInfoBase<
  'attestation',
  Attestation & {
    username: string;
    evidence: string;
  }
>;
export type InvitationAcceptedActivityInfo = ActivityInfoBase<'invitation-accepted', Profile>;
export type ReviewActivityInfo = ActivityInfoBase<'review', Review>;
export type VouchActivityInfo = ActivityInfoBase<'vouch', Vouch & VouchFunds>;
export type UnvouchActivityInfo = ActivityInfoBase<'unvouch', Vouch & VouchFunds>;

export type ActivityInfo =
  | AttestationActivityInfo
  | InvitationAcceptedActivityInfo
  | ReviewActivityInfo
  | VouchActivityInfo
  | UnvouchActivityInfo;

export type ActivityActor = {
  userkey: string;
  profileId?: ProfileId;
  name: string | null;
  username?: string | null;
  avatar: string | null;
  description: string | null;
  score: number;
  primaryAddress: Address;
};

export type RecentInteractionActivityActor = ActivityActor & {
  interaction: Relationship | undefined;
};

export type VoteInfo = {
  upvotes: number;
  downvotes: number;
};
