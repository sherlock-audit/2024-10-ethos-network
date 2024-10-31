import { type ScoreRange, type ScoreLevel } from './score.types';

export enum ScoreElementNames {
  ETHEREUM_ADDRESS_AGE = 'Ethereum Address Age',
  TWITTER_ACCOUNT_AGE = 'Twitter Account Age',
  ETHOS_INVITATION_SOURCE_CREDIBILITY = 'Ethos Invitation Source Credibility',
  REVIEW_IMPACT = 'Review Impact',
  VOUCHED_ETHEREUM_IMPACT = 'Vouched Ethereum Impact',
  NUMBER_OF_VOUCHERS_IMPACT = 'Number of Vouchers Impact',
}

export const scoreRanges: Record<ScoreLevel, ScoreRange> = {
  untrusted: { min: 0, max: 799 },
  questionable: { min: 800, max: 1199 },
  neutral: { min: 1200, max: 1599 },
  reputable: { min: 1600, max: 1999 },
  exemplary: { min: 2000, max: 2800 },
};

/**
 * The number of days a user is bonded with their inviter after accepting an invitation
 */
export const bondingPeriod = 90;
