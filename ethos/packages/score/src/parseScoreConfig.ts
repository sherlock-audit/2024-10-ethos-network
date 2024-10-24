import { parseCustomElementDefinition, parseScoreCalculation } from './parseScore';
import { type ScoreElement } from './score.types';
import { type ScoreCalculation } from './scoreCalculation';

export type ScoreConfig = {
  rootCalculation: ScoreCalculation;
  elementDefinitions: ScoreElement[];
};

export type RawScoreConfig = {
  expression: string[];
  elements: Record<
    string,
    | {
        Interval: string[];
      }
    | {
        Number: string;
      }
    | {
        Range: number[];
      }
  >;
};

/**
 * Parses a JSON score configuration and returns the root calculation and elements.
 * @param scoreConfig - The JSON score configuration.
 * @returns An object containing the root calculation and elements.
 * @throws Error if the score configuration is invalid.
 */
export function parseScoreConfig(scoreConfig: RawScoreConfig): ScoreConfig {
  const { expression, elements } = scoreConfig;

  const concatenatedExpression = expression.join(' + ');
  const elementDefinitions = parseCustomElementDefinition(elements);
  const rootCalculation = parseScoreCalculation(concatenatedExpression, elementDefinitions);

  return { rootCalculation, elementDefinitions };
}
