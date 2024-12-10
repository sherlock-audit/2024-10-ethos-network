import { type EthosUserTarget } from '@ethos/domain';
import { ScoreElementNames, type ElementName, type ScoreElement } from '@ethos/score';
import { snakeCase } from 'lodash-es';
import { metrics } from '../../common/metrics.js';
import { ethereumAddressAge } from './elements/ethereum.js';
import {
  ethosInvitation,
  mutualVouchImpact,
  numVouchersImpact,
  reviewImpact,
  voteImpact,
  vouchedEthImpact,
} from './elements/ethos.js';
import { twitterAccountAge } from './elements/twitter.js';
import { type ScoreMetadata, type ScoreElementImplementation } from './types.js';

const scoreCalculationDuration = metrics.makeSummary({
  name: 'score_element_calculation_duration',
  help: 'Duration of score calculation per element',
  labelNames: ['element'],
});

const scoreElementOptions: Record<ElementName, ScoreElementImplementation> = {
  [ScoreElementNames.ETHEREUM_ADDRESS_AGE]: ethereumAddressAge,
  [ScoreElementNames.TWITTER_ACCOUNT_AGE]: twitterAccountAge,
  [ScoreElementNames.ETHOS_INVITATION_SOURCE_CREDIBILITY]: ethosInvitation,
  [ScoreElementNames.REVIEW_IMPACT]: reviewImpact,
  [ScoreElementNames.VOUCHED_ETHEREUM_IMPACT]: vouchedEthImpact,
  [ScoreElementNames.NUMBER_OF_VOUCHERS_IMPACT]: numVouchersImpact,
  [ScoreElementNames.MUTUAL_VOUCHER_BONUS]: mutualVouchImpact,
  [ScoreElementNames.VOTE_IMPACT]: voteImpact,
};

type PopulateUserInputsResult = {
  elementValues: Record<string, number>;
  metadata: Record<string, ScoreMetadata>;
  errors: string[];
};

export async function populateUserInputs(
  elementDefinitions: ScoreElement[],
  target: EthosUserTarget,
): Promise<PopulateUserInputsResult> {
  const results: PopulateUserInputsResult = { elementValues: {}, metadata: {}, errors: [] };

  if (!elementDefinitions) {
    throw new Error(`Attempted to populate score inputs without elementDefinitions`);
  }

  await Promise.all(
    elementDefinitions.map(async (element) => {
      const start = Date.now();

      if (!scoreElementOptions[element.name]) {
        throw new Error(`api.score.unknownElementLookup: ${element.name}`);
      }
      try {
        const result = await scoreElementOptions[element.name](target);
        results.elementValues[element.name] = result.score;
        results.metadata[element.name] = result.metadata;
      } catch (err) {
        results.errors.push(element.name);
        results.metadata[element.name] = { error: 1 };
      } finally {
        scoreCalculationDuration.observe({ element: snakeCase(element.name) }, Date.now() - start);
      }
    }),
  );

  return results;
}

export async function simulateUserInputs(
  simulatedInput: Record<string, number>,
  elementDefinitions: ScoreElement[],
  target: EthosUserTarget,
): Promise<PopulateUserInputsResult> {
  const results: PopulateUserInputsResult = { elementValues: {}, metadata: {}, errors: [] };

  if (!elementDefinitions) {
    throw new Error(`Attempted to populate score inputs without elementDefinitions`);
  }

  await Promise.all(
    elementDefinitions.map(async (element) => {
      if (!scoreElementOptions[element.name]) {
        throw new Error(`api.score.unknownElementLookup: ${element.name}`);
      }
      try {
        if (element.name in simulatedInput) {
          results.elementValues[element.name] = simulatedInput[element.name];
          results.metadata[element.name] = { simulated: 1 };
        } else {
          const result = await scoreElementOptions[element.name](target);
          results.elementValues[element.name] = result.score;
          results.metadata[element.name] = result.metadata;
        }
      } catch (err) {
        results.errors.push(element.name);
      }
    }),
  );

  return results;
}
