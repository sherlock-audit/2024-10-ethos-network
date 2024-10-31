import { type ElementName, type ElementResult } from '@ethos/score';
import { type ScoreImpact } from './score';

// TODO: Might not be a great idea to tie this @ethos/domain to @ethos/score through the import

export type ScoreCalculationResults = {
  score: number;
  elements: Record<ElementName, ElementResult>;
  errors: string[];
};

export type ScoreSimulationResult = {
  simulation: {
    value: number;
    impact: ScoreImpact;
    adjustedRecipientScore: number;
    relativeValue: number;
  };
  calculationResults?: ScoreCalculationResults;
  errors: string[];
};
