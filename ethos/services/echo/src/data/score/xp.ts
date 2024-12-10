import { type EthosUserTarget } from '@ethos/domain';
import { convertScoreToLevel, scoreLevelXpMultiplier } from '@ethos/score';
import { getLatestScoreOrCalculate } from './calculate.js';

/**
 * Retrieves the score multiplier for a given target.
 *
 * @param {EthosUserTarget} target - The Ethos user target to retrieve the score multiplier for.
 * @returns {Promise<number>} A promise that resolves to the multiplier for the given target's score.
 */
export async function getTargetScoreXpMultiplier(target: EthosUserTarget): Promise<number> {
  const score = await getLatestScoreOrCalculate(target);

  // If the score is 0, defaulting to neutral multiplier (most likely the score calculation failed)
  if (score.score === 0) {
    return scoreLevelXpMultiplier.neutral;
  }

  return getScoreXpMultiplier(score.score);
}

/**
 * Retrieves the score multiplier for a given score.
 *
 * @param score - The score to retrieve the multiplier for.
 * @returns The multiplier for the given score.
 */
export function getScoreXpMultiplier(score: number): number {
  const level = convertScoreToLevel(score);

  return scoreLevelXpMultiplier[level];
}
