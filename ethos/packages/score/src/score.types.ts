import { type ScoreCalculation } from './scoreCalculation.js';

export type ScoreConfig = {
  rootCalculation: ScoreCalculation;
  elementDefinitions: ScoreElement[];
};

/**
 * Represents an arbitrary score element.
 * This should never be used directly; use a subtype instead.
 */
export type ScoreElement = LookupInterval | LookupNumber | ScoreCalculation | ConstantValueElement;

export type ScoreElementBase = {
  name: ElementName;
  type: ElementType;
};

export type ElementName = string;

export type ElementType = 'LookupInterval' | 'LookupNumber' | 'Calculation' | 'Constant';

export function isLookupNumber(element: ScoreElement): element is LookupNumber {
  return element.type === 'LookupNumber';
}

export function isLookupInterval(element: ScoreElement): element is LookupInterval {
  return element.type === 'LookupInterval';
}

export function isScoreCalculation(element: ScoreElement): element is ScoreCalculation {
  return element.type === 'Calculation';
}

export function isConstantValueElement(element: ScoreElement): element is ConstantValueElement {
  return element.type === 'Constant';
}

/**
 * The result of an element calculation, including the element, raw value,
 * weighted value (when slotted into an IntervalLookup), and any errors
 * encountered during calculation.
 */
export type ElementResult = {
  element: ScoreElement;
  raw: number;
  weighted: number;
  error: boolean;
};

/**
 * Constant elements return a static value.
 */
export type ConstantValueElement = {
  type: 'Constant';
  value: number;
} & ScoreElementBase;

/**
 * Generate a score based on placement within a defined set of ranges.
 * If the value does not fit into the defined ranges, use the outOfRangeScore.
 * If a range start or end is undefined, it's considered to be negative or positive infinity, respectively.
 */
export type LookupInterval = {
  type: 'LookupInterval';
  ranges: IntervalRange[];
  outOfRangeScore: number;
} & ScoreElementBase;

export type IntervalRange = {
  start: number | undefined;
  end: number | undefined;
  score: number;
};

/**
 * Lookup elements that return a single number.
 */
export type LookupNumber = {
  type: 'LookupNumber';
  range: { min: number; max: number };
} & ScoreElementBase;

export type ElementInputs = Record<ElementName, number>;

export type ScoreLevel = 'untrusted' | 'questionable' | 'neutral' | 'reputable' | 'exemplary';

export type ScoreRange = {
  min: number;
  max: number;
};

/**
 * Credibility Factor helps explain the relevance of a score element
 * by providing a relative status and impact for a given element value
 */
export type CredibilityFactor = {
  name: string;
  range: { min: number; max: number };
  value: number;
  weighted: number;
};
