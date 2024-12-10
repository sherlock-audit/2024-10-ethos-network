import { type ScoreImpact, type EthosUserTarget } from '@ethos/domain';
import { type ElementName, type ElementResult } from '@ethos/score';
import { type Prisma } from '@prisma-pg/client';

export type LatestScore = Prisma.ScoreHistoryGetPayload<{
  select: {
    createdAt: true;
    score: true;
    id: true;
    target: true;
    dirty: true;
    txHash: true;
  };
}>;

export type LatestScoreOptions = {
  allowDirty?: boolean;
  asyncCalculate?: boolean;
  includeElements?: boolean;
  txn?: string;
};

export type ScoreElementImplementation = (target: EthosUserTarget) => Promise<ScoreElementResult>;

export type ScoreElementResult = {
  score: number;
  metadata: ScoreMetadata;
};
export type ScoreMetadata = Record<string, number>;

export type ScoreCalculationResults = {
  score: number;
  elements: Record<ElementName, ElementResult>;
  metadata: Record<ElementName, ScoreMetadata>;
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

export type ScoreHistoryRecord = {
  score: number;
  createdAt: Date;
  txHash?: string | null;
  ScoreHistoryElement?: Array<{
    scoreElement: {
      name: string;
      raw: number;
      weighted: number;
      error: boolean;
      metadata: ScoreMetadata;
    };
  }>;
};
