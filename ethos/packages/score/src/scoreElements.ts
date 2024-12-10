import {
  type ConstantValueElement,
  type ElementInputs,
  type ScoreElement,
  type LookupInterval,
  type LookupNumber,
  type ElementName,
  isLookupInterval,
  isLookupNumber,
  isScoreCalculation,
  isConstantValueElement,
} from './score.types.js';
import { applyCalculation } from './scoreCalculation.js';

/**
 * Recursively apply element calculations (according to each subclass type) to generate a score.
 */
export function calculateElement(element: ScoreElement, inputs: ElementInputs): { score: number } {
  if (isLookupInterval(element)) {
    return applyLookup(element, inputs);
  }
  if (isLookupNumber(element)) {
    return applyLookup(element, inputs);
  }
  if (isScoreCalculation(element)) {
    return applyCalculation(element, inputs);
  }
  if (isConstantValueElement(element)) {
    return applyConstantValueElement(element, inputs);
  }
  throw new Error(`Unknown element type: ${(element as any).type ?? 'undefined'}`);
}

function applyConstantValueElement(
  element: ConstantValueElement,
  _inputs: ElementInputs,
): { score: number } {
  return { score: element.value };
}

export function newConstantElement(name: ElementName, value: number): ConstantValueElement {
  return {
    name,
    type: 'Constant',
    value,
  };
}

function applyLookup(
  lookup: LookupInterval | LookupNumber,
  inputs: ElementInputs,
): { score: number } {
  switch (lookup.type) {
    case 'LookupInterval':
      return applyInterval(lookup, inputs);
    case 'LookupNumber':
      return applyLookupNumber(lookup, inputs);
  }
}

/**
 * Maps an input value to a score based on a set of interval ranges.
 *
 * Each interval has a series of ranges with start/end boundaries and corresponding scores.
 * The function finds which range contains the input value and returns that range's score.
 *
 * Example for "Ethereum Address Age":
 * - 0-90 days: score = 0
 * - 90-365 days: score = 25
 * - 365-1461 days: score = 100
 * - 1461+ days: score = 250
 *
 * If the input doesn't fall into any defined range, returns the outOfRangeScore.
 *
 * @param interval - The interval definition with its ranges and scores
 * @param inputs - The raw input values to check against ranges
 * @returns The score for the matching range
 */
function applyInterval(interval: LookupInterval, inputs: ElementInputs): { score: number } {
  const input = inputs[interval.name];

  for (const range of interval.ranges) {
    if (
      (range.start === undefined || input >= range.start) &&
      (range.end === undefined || input < range.end)
    ) {
      return { score: range.score };
    }
  }

  return { score: interval.outOfRangeScore };
}

export function newLookupNumber(name: ElementName, [min, max]: [number, number]): LookupNumber {
  const lookupNumber: LookupNumber = {
    name,
    type: 'LookupNumber',
    range: { min, max },
  };

  return lookupNumber;
}

/**
 * Restricts a lookup output to a defined range.
 *
 * Each lookup score element has a minimum and maximum possible value. This function ensures
 * the calculated score stays within those bounds:
 *
 * Example:
 * - For "Review Impact": range is -400 to +400
 * - For "Number of Vouchers": range is 0 to +400
 *
 * If a calculated score falls outside its range, it gets clamped to the nearest boundary.
 * For instance, if a Review Impact score calculates to -500, it would be clamped to -400.
 *
 * @param lookup - The score element definition with its range constraints
 * @param inputs - The raw input values to calculate scores from
 * @returns The clamped score value
 */
function applyLookupNumber(lookup: LookupNumber, inputs: ElementInputs): { score: number } {
  const input = inputs[lookup.name];
  const min = lookup.range?.min;
  const max = lookup.range?.max;

  if (typeof min !== 'number' || typeof max !== 'number') {
    return { score: input };
  }

  if (input < min) {
    return { score: min };
  }
  if (input > max) {
    return { score: max };
  }

  return { score: input };
}
