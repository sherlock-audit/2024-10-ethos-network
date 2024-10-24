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
} from './score.types';
import { applyCalculation } from './scoreCalculation';

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

export function newLookupNumber(name: ElementName, range: [number, number]): LookupNumber {
  return {
    name,
    type: 'LookupNumber',
    range: { min: range[0], max: range[1] },
  };
}

function applyLookupNumber(lookup: LookupNumber, inputs: ElementInputs): { score: number } {
  const input = inputs[lookup.name];

  // TODO gracefully handle score elements without defined ranges, but eventually we should
  // prevent score definitions that lack them
  if (lookup.range.min === undefined || lookup.range.max === undefined) {
    return { score: input };
  }

  if (input < lookup.range.min) {
    return { score: lookup.range.min };
  }
  if (input > lookup.range.max) {
    return { score: lookup.range.max };
  }

  return { score: input };
}
