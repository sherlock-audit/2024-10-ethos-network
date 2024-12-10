import { type ScoreRange, type ScoreLevel } from './score.types.js';

export const scoreRanges: Record<ScoreLevel, ScoreRange> = {
  untrusted: { min: 0, max: 799 },
  questionable: { min: 800, max: 1199 },
  neutral: { min: 1200, max: 1599 },
  reputable: { min: 1600, max: 1999 },
  exemplary: { min: 2000, max: 2800 },
};

/**
 * The score displayed as a fallback if real score could not be retrieved.
 */
export const DEFAULT_STARTING_SCORE = 1000;

/**
 * The number of days a user is bonded with their inviter after accepting an invitation
 */
export const bondingPeriod = 90;
/**
 * The factor by which the inviter's score is multiplied to determine the invitee's score impact
 */
export const invitationScoreFactor = 0.2;

/**
 * The maximum number of days to consider when calculating vouched ETH impact.
 */
export const maxVouchedEthDays = 180;

/**
 * Mutual vouch bonus multiplier
 * Added on top of the underlying vouch impact
 */
export const mutualVouchMultiplier = 0.5;

export const scoreLevelXpMultiplier: Record<ScoreLevel, number> = {
  exemplary: 1.5,
  reputable: 1.25,
  neutral: 1,
  questionable: 0.5,
  untrusted: 0.2,
};
