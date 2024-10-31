import { type ErrorDescription } from 'ethers';
import { type Address } from 'viem';

export type ProfileId = number;

export type Profile = {
  id: ProfileId;
  archived: boolean;
  createdAt: number;
  addresses: Address[];
  primaryAddress: Address;
  inviteInfo: InviteInfo;
};

export type InviteInfo = {
  sent: Address[];
  acceptedIds: number[];
  available: number;
  invitedBy: ProfileId;
};

export type AttestationService = 'x.com';

export type Attestation = {
  id: number;
  hash: string;
  archived: boolean;
  profileId: ProfileId;
  account: string;
  service: AttestationService;
  createdAt: number;
};

export type AttestationTarget = {
  service: AttestationService;
  account: string;
};

export type EmptyAttestationTarget = {
  service: '';
  account: '';
};

export const Score = {
  negative: 0,
  neutral: 1,
  positive: 2,
} as const;

export type ScoreType = keyof typeof Score;
export type ScoreValue = (typeof Score)[ScoreType];

export const NegativeReview = 'negative' as const satisfies ScoreType;
export const NeutralReview = 'neutral' as const satisfies ScoreType;
export const PositiveReview = 'positive' as const satisfies ScoreType;

export const ScoreByValue = {
  0: NegativeReview,
  1: NeutralReview,
  2: PositiveReview,
} as const satisfies Record<ScoreValue, ScoreType>;

function isScoreValue(score: number): score is ScoreValue {
  return Object.values(Score).some((s) => s === score);
}

export function getScoreValue(score: number): ScoreValue {
  if (!isScoreValue(score)) {
    throw new Error('Invalid review score value');
  }

  return score;
}

export type Review = {
  id: number;
  author: Address;
  authorProfileId: ProfileId;
  subject: Address;
  score: ScoreType;
  comment: string;
  metadata: string;
  createdAt: number;
  archived: boolean;
  attestationDetails?: {
    account: string;
    service: string;
  };
};

export type ReviewTarget = { address: Address } | { service: string; account: string };

export const ReviewsBy = {
  author: 0,
  subject: 1,
  attestationHash: 2,
} as const;

export type ReviewsByType = keyof typeof ReviewsBy;

export type Vouch = {
  id: number;
  archived: boolean;
  unhealthy: boolean;
  authorProfileId: ProfileId;
  stakeToken: Address;
  subjectProfileId: ProfileId;
  comment: string;
  metadata: string;
  activityCheckpoints: {
    vouchedAt: number;
    unvouchedAt: number;
    unhealthyAt: number;
  };
};

/**
 * Financial accounting for vouch balances at different points in time.
 */
export type VouchFunds = {
  /**
   * The initial amount transferred before fees.
   */
  deposited: bigint;
  /**
   * The amount vouched after fees.
   */
  staked: bigint;
  /**
   * The current balance.
   */
  balance: bigint;
  /**
   * Amount withdrawn when unvouching (after fees); zero until unvouched.
   */
  withdrawn: bigint;
};

export type Reply = {
  parentIsOriginalComment: boolean;
  targetContract: string;
  authorProfileId: ProfileId;
  id: bigint;
  parentId: bigint;
  createdAt: number;
  content: string;
  metadata: string;
};

export type Vote = {
  isUpvote: boolean;
  isArchived: boolean;
  voter: ProfileId;
  targetContract: Address;
  targetId: bigint;
  createdAt: number;
};

export type CancelListener = () => Promise<void>;

export type Balance = {
  profileId: ProfileId;
  token: Address;
  balance: string;
};

export type Fees = {
  entryProtocolFeeBasisPoints: bigint;
  exitFeeBasisPoints: bigint;
  entryDonationFeeBasisPoints: bigint;
  entryVouchersPoolFeeBasisPoints: bigint;
};

export const MarketCreationErrorCode = {
  PROFILE_NOT_ALLOWED: 0,
  PROFILE_MISMATCH: 1,
} as const;

export class BlockchainError extends Error {
  override name: string;
  args: Record<string, string>;

  constructor(parsedError: ErrorDescription) {
    const argsMap: Record<string, string> = {};

    parsedError.args.forEach((arg, index) => {
      if (parsedError.fragment.inputs[index]) {
        const inputName = parsedError.fragment.inputs[index].name;
        argsMap[inputName] = arg.toString();
      }
    });
    const formattedArgs = Object.entries(argsMap)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    super(`${formattedArgs}`);
    this.name = parsedError.name;
    this.args = argsMap;
  }
}
