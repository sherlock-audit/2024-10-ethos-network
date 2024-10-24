import { type ProfileId } from '@ethos/blockchain-manager';
import { type Address } from 'viem';
import { type ScoreImpact } from './score';

export type Invitation = {
  id: string;
  senderProfileId: number;
  recipientAddress: Address;
  // txnHash: string; NOT IMPLEMENTED YET
  status: InvitationStatus;
  score: {
    value: number;
    impact: ScoreImpact;
  };
  dateInvited: Date;
  dateAccepted?: Date;
};

export type PendingInvitation = {
  id: ProfileId;
  impact: {
    value: number;
    relativeValue: number;
    impact: ScoreImpact;
    adjustedRecipientScore: number;
  };
};

export enum InvitationStatus {
  ACCEPTED = 'ACCEPTED',
  INVITED = 'INVITED',
  ACCEPTED_OTHER_INVITATION = 'ACCEPTED_OTHER_INVITATION',
}
