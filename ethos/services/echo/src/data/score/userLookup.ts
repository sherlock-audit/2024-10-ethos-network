import { type EthosUserTarget } from '@ethos/domain';
import { ScoreElementNames, type ElementName, type ScoreElement } from '@ethos/score';
import { snakeCase } from 'lodash';
import { metrics } from '../../common/metrics';
import { ethereumAddressAge } from './elements/ethereum';
import {
  ethosInvitation,
  numVouchersImpact,
  reviewImpact,
  vouchedEthImpact,
} from './elements/ethos';
import { twitterAccountAge } from './elements/twitter';

type ScoreElementDefinition = (target: EthosUserTarget) => Promise<number> | number;

const scoreCalculationDuration = metrics.makeSummary({
  name: 'score_element_calculation_duration',
  help: 'Duration of score calculation per element',
  labelNames: ['element'],
});

const scoreElementOptions: Record<ElementName, ScoreElementDefinition> = {
  [ScoreElementNames.ETHEREUM_ADDRESS_AGE]: ethereumAddressAge,
  [ScoreElementNames.TWITTER_ACCOUNT_AGE]: twitterAccountAge,
  [ScoreElementNames.ETHOS_INVITATION_SOURCE_CREDIBILITY]: ethosInvitation,
  [ScoreElementNames.REVIEW_IMPACT]: reviewImpact,
  [ScoreElementNames.VOUCHED_ETHEREUM_IMPACT]: vouchedEthImpact,
  [ScoreElementNames.NUMBER_OF_VOUCHERS_IMPACT]: numVouchersImpact,
};

export async function populateUserInputs(
  elementDefinitions: ScoreElement[],
  target: EthosUserTarget,
): Promise<{ elementValues: Record<string, number>; errors: string[] }> {
  const elementValues: Record<string, number> = {};
  const errors: string[] = [];

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
        elementValues[element.name] = await scoreElementOptions[element.name](target);
      } catch (err) {
        errors.push(element.name);
      } finally {
        scoreCalculationDuration.observe({ element: snakeCase(element.name) }, Date.now() - start);
      }
    }),
  );

  return { elementValues, errors };
}

export async function simulateUserInputs(
  simulatedInput: Record<string, number>,
  elementDefinitions: ScoreElement[],
  target: EthosUserTarget,
): Promise<{ elementValues: Record<string, number>; errors: string[] }> {
  const elementValues: Record<string, number> = {};
  const errors: string[] = [];

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
          elementValues[element.name] = simulatedInput[element.name];
        } else {
          elementValues[element.name] = await scoreElementOptions[element.name](target);
        }
      } catch (err) {
        errors.push(element.name);
      }
    }),
  );

  return { elementValues, errors };
}
