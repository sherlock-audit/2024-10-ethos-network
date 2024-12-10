import { type VouchFunds, type Review, type Vouch } from '@ethos/blockchain-manager';

export type ActivityItem =
  | {
      type: 'review';
      data: Review;
      timestamp: number;
    }
  | {
      type: 'vouch';
      data: Vouch & VouchFunds;
      timestamp: number;
    };
