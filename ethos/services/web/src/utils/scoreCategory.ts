import { scoreRanges, type ScoreLevel, type ScoreRange } from '@ethos/score';
import { theme } from 'antd';
import { type Entries } from 'type-fest';
import { getColorFromScoreLevel } from './score';

type ScoreCategory = {
  min: number;
  max: number;
  status: ScoreLevel;
  color: string;
};

export function useScoreCategory(score: number): [ScoreCategory, number] {
  const { token } = theme.useToken();
  const scoreCategory = (Object.entries(scoreRanges) as Entries<typeof scoreRanges>).find(
    ([_, range]) => score >= range.min && score <= range.max,
  );
  const defaultScoreCategory: [ScoreLevel, ScoreRange] = ['neutral', scoreRanges.neutral];

  const [status, { min, max }] = scoreCategory ?? defaultScoreCategory;

  const percentage = calculateWeightedPercentage(score);

  const color = getColorFromScoreLevel(status, token);

  return [{ min, max, status, color }, percentage];
}

/**
 * In UI we have a circular progress bar that represents the Ethos score. While
 * score ranges are not equally distributed, the circular progress bar is
 * equally divided into the number of categories.
 * This function calculates the weighted percentage of the score to be
 * represented in that equally divided segmented circular progress.
 *
 * It's also dynamic, meaning that if we change the number of score ranges or
 * their boundaries, the function will still work.
 *
 * @param score Ethos score
 * @returns percentage
 */
function calculateWeightedPercentage(score: number): number {
  const scoreRangesTuple = Object.values(scoreRanges);

  const min = scoreRangesTuple.at(0)?.min;
  const max = scoreRangesTuple.at(-1)?.max;

  if (typeof min !== 'number' || typeof max !== 'number') {
    throw new Error('Score ranges must have a min and max value');
  }

  if (score < min || score > max) {
    throw new Error(`Score must be between ${min} and ${max}`);
  }

  const steps = scoreRangesTuple.length;
  const percentagePerStep = 100 / steps;

  for (let i = 0; i < steps; i++) {
    const { min, max } = scoreRangesTuple[i];

    if (score >= min && score <= max) {
      return percentagePerStep * i + ((score - min) / (max - min)) * percentagePerStep;
    }
  }

  throw new Error('Score must be between min and max of score ranges');
}
