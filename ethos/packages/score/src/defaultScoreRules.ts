import cloneDeep from 'lodash-es/cloneDeep.js';
import { DEFAULT_STARTING_SCORE } from './score.constant.js';
import { type ScoreConfig, type ScoreElement } from './score.types.js';

/**
 * Get the default score calculation configuration.
 * Note: do not export the default score rules directly, as modifications could
 * persist between returned objects.
 * @returns {ScoreConfig} A deep clone of the default score rules configuration
 */
export function getDefaultScoreCalculation(): ScoreConfig {
  return cloneDeep(defaultScoreRules);
}

/**
 * Enumeration of all available score element names used in the scoring algorithm.
 * Each element represents a different factor that contributes to the final score.
 */
export enum ScoreElementNames {
  /** Days since first transaction */
  ETHEREUM_ADDRESS_AGE = 'Ethereum Address Age',
  /** Days since profile registered */
  TWITTER_ACCOUNT_AGE = 'Twitter Account Age',
  ETHOS_INVITATION_SOURCE_CREDIBILITY = 'Ethos Invitation Source Credibility',
  REVIEW_IMPACT = 'Review Impact',
  VOUCHED_ETHEREUM_IMPACT = 'Vouched Ethereum Impact',
  NUMBER_OF_VOUCHERS_IMPACT = 'Number of Vouchers Impact',
  MUTUAL_VOUCHER_BONUS = 'Mutual Vouch Bonus',
  VOTE_IMPACT = 'Vote Impact',
}

const elementDefinitions: ScoreElement[] = [
  {
    name: ScoreElementNames.ETHEREUM_ADDRESS_AGE,
    type: 'LookupInterval',
    ranges: [
      { start: undefined, end: 90, score: 0 },
      { start: 90, end: 365, score: 15 },
      { start: 365, end: 1461, score: 25 },
      { start: 1461, end: 2922, score: 50 },
      { start: 2922, end: undefined, score: 75 },
    ],
    outOfRangeScore: 0,
  },
  {
    name: ScoreElementNames.TWITTER_ACCOUNT_AGE,
    type: 'LookupInterval',
    ranges: [
      { start: 0, end: 90, score: -250 },
      { start: 90, end: 365, score: -50 },
      { start: 365, end: 730, score: 0 },
      { start: 1461, end: undefined, score: 25 },
    ],
    outOfRangeScore: 0,
  },
  {
    name: ScoreElementNames.ETHOS_INVITATION_SOURCE_CREDIBILITY,
    type: 'LookupNumber',
    range: { min: -200, max: 360 },
  },
  {
    name: ScoreElementNames.REVIEW_IMPACT,
    type: 'LookupNumber',
    range: { min: -400, max: 300 },
  },
  {
    name: ScoreElementNames.VOUCHED_ETHEREUM_IMPACT,
    type: 'LookupNumber',
    range: { min: 0, max: 300 },
  },
  {
    name: ScoreElementNames.NUMBER_OF_VOUCHERS_IMPACT,
    type: 'LookupNumber',
    range: { min: 0, max: 300 },
  },
  {
    name: ScoreElementNames.MUTUAL_VOUCHER_BONUS,
    type: 'LookupNumber',
    range: { min: 0, max: 300 },
  },
  {
    name: ScoreElementNames.VOTE_IMPACT,
    type: 'LookupNumber',
    range: { min: -400, max: 100 },
  },
];

const defaultScoreRules: ScoreConfig = {
  rootCalculation: {
    type: 'Calculation',
    name: 'Root Score Calculation',
    operation: '+',
    elements: [
      { type: 'Constant', name: 'Base Score', value: DEFAULT_STARTING_SCORE },
      ...elementDefinitions,
    ],
  },
  elementDefinitions,
};

const scoreElementMap = new Map(elementDefinitions.map((element) => [element.name, element]));

/**
 * Retrieves a score element configuration by name.
 * @param {ScoreElementNames} name - The name of the score element to retrieve
 * @returns {ScoreElement | undefined} The score element configuration if found, undefined otherwise
 *
 * @example
 * const ethAgeElement = getScoreElement(ScoreElementNames.ETHEREUM_ADDRESS_AGE);
 * if (ethAgeElement?.type === 'LookupInterval') {
 *   // Process interval-based scoring
 * }
 */
export function getScoreElement(name: ScoreElementNames): ScoreElement | undefined {
  return scoreElementMap.get(name);
}
