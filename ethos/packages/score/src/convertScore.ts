import { type Entries } from 'type-fest';
import { scoreRanges } from './score.constant.js';
import {
  type CredibilityFactor,
  type ScoreLevel,
  type ScoreElement,
  isLookupInterval,
  isLookupNumber,
  isScoreCalculation,
  isConstantValueElement,
} from './score.types.js';
import { calculateElement } from './scoreElements.js';

/**
 * Converts a numerical score to its corresponding ScoreLevel category
 * We use ScoreLevels to describe in plain terms the credibility of an actor/user
 *
 * @param score - The numerical score to convert.
 * @returns The corresponding ScoreLevel (e.g., 'untrusted', 'questionable', 'neutral', 'reputable', 'exemplary').
 * @throws Error if the score doesn't fall within any defined range.
 */
export function convertScoreToLevel(score: number): ScoreLevel {
  const scoreRange = (Object.entries(scoreRanges) as Entries<typeof scoreRanges>).find(
    ([_, { min, max }]) => score >= min && score <= max,
  );

  if (!scoreRange) {
    throw new Error(`Invalid score: ${score}`);
  }

  return scoreRange[0];
}

/**
 * Helps explain each score element as a Credibility Factor
 * A credibility factor demonstrates the relative contribution of each score element
 * to the overall score, and can be used to explain why a particular score was assigned
 *
 * It includes the maximum possible range by which this element can impact the score,
 * as well as the raw value (ie, # of days) and weighted value (ie, determined by interval)
 * of that raw value.
 *
 * @param scoreElement - The ScoreElement to be converted.
 * @param value - The numerical value associated with the ScoreElement.
 * @returns A CredibilityFactor object containing the name, range, value, and weighted score.
 */
export function convertScoreElementToCredibilityFactor(
  scoreElement: ScoreElement,
  value: number,
): CredibilityFactor {
  if (scoreElement.type !== 'LookupInterval' && scoreElement.type !== 'LookupNumber') {
    throw new Error('Invalid score element type');
  }

  const range = elementRange(scoreElement);
  const weighted = calculateElement(scoreElement, { [scoreElement.name]: value }).score;

  return {
    name: scoreElement.name,
    range,
    value,
    weighted,
  };
}

/**
 * Determine the range by which a score element can impact the score
 * (score element impact range differs depending if it's defined by interval or sigmoid)
 * @param element - The ScoreElement to determine the range of
 * @returns The range of the score element, as a { min, max } object
 * @throws Error if the score element type is invalid
 */
export function elementRange(element: ScoreElement): { min: number; max: number } {
  if (isLookupInterval(element)) {
    const min = element.ranges.reduce((min, r) => Math.min(min, r.score), 1000);
    const max = element.ranges.reduce((max, r) => Math.max(max, r.score), -1000);

    return { min, max };
  }
  if (isLookupNumber(element)) {
    return element.range;
  }
  if (isScoreCalculation(element)) {
    return { min: 0, max: 0 };
  }
  if (isConstantValueElement(element)) {
    return { min: 0, max: 0 };
  }
  throw new Error(`Unsupported element type: ${JSON.stringify(element)}`);
}
