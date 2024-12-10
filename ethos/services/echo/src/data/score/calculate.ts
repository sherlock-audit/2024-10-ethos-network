import { type EthosUserTarget, fromUserKey } from '@ethos/domain';
import {
  calculateElement,
  calculateScore,
  type ElementResult,
  getDefaultScoreCalculation,
  type ScoreConfig,
} from '@ethos/score';
import { type Prisma, type ScoreHistory, type ScoreElementRecord } from '@prisma-pg/client';
import { metrics } from '../../common/metrics.js';
import { prisma } from '../db.js';
import { findScoreTargetKey } from './lookup.js';
import { type ScoreCalculationResults, type LatestScore, type ScoreMetadata } from './types.js';
import { populateUserInputs } from './userLookup.js';

// lock to prevent multiple score calculations from running concurrently
const calculationLock = new Map<string, boolean>();

// score algorithm version doesn't change at runtime, so cache it
let cachedAlgorithmVersion: number | undefined;

const scoreCalculationDuration = metrics.makeSummary({
  name: 'score_calculation_duration',
  help: 'Duration of score calculation',
  labelNames: ['target_type'],
});

/**
 * Retrieves the latest score for a given ethos user target.
 *
 * @param target - The Ethos user target to look up.
 * @returns The most recent ScoreHistory entry for the user, or null if none found.
 *
 * WARNING: This function is not guaranteed to return a valid score. If the score doesn't exist
 * this will return null. If the score is stale/dirty/out-of-date, this will return it anyway.
 * Use getLatestScoreOrCalculate if you need to ensure a recent score.
 *
 * However, if the score is stale/dirty, it will trigger an update in the background.
 */
export async function getLatestScore(target: EthosUserTarget): Promise<LatestScore | null> {
  const targetKey = await findScoreTargetKey(target);
  const where: Prisma.ScoreHistoryWhereInput = { target: targetKey };

  const result = await prisma.scoreHistory.findFirst({
    select: {
      createdAt: true,
      score: true,
      id: true,
      target: true,
      dirty: true,
      txHash: true,
    },
    where,
    orderBy: { createdAt: 'desc' },
  });

  if (result?.dirty) void triggerScoreUpdate(target, result.txHash ?? undefined);

  return result;
}

/**
 * Retrieves the latest score for a given user target or calculates a new one if necessary.
 *
 * WARNING: calculating score is an expensive action and requires multiple API calls, with potentially high latency
 * Be careful calling this inline; use getLatestScore if you don't need to force recalculation
 *
 * @param target - The Ethos user target to get or calculate the score for.
 * @returns A Promise that resolves to a ScoreHistory object containing the latest or newly calculated score.
 *
 * This function first attempts to retrieve the latest score for the given user target.
 * If no score exists or if the existing score is more than 1 day old, it calculates a new score.
 * The new score is then updated in the database and returned.
 */
export async function getLatestScoreOrCalculate(
  target: EthosUserTarget,
): Promise<NonNullable<Awaited<ReturnType<typeof getLatestScore>>>> {
  const latest = await getLatestScore(target);

  if (!latest) return await updateScore(target);

  return latest;
}

/**
 * Update the score for this provided user if it's not already in progress
 *
 * Meant to be used for asynchronous score update actions; returns nothing
 * @param target - The Ethos user target to trigger a score update for.
 */
export async function triggerScoreUpdate(target: EthosUserTarget, txHash?: string): Promise<void> {
  const targetKey = await findScoreTargetKey(target);

  // score calculation already in progress, skip
  if (calculationLock.get(targetKey)) {
    return;
  }
  calculationLock.set(targetKey, true);
  await updateScore(target, txHash);
}

async function getScoreAlgoVersion(): Promise<number> {
  if (cachedAlgorithmVersion !== undefined) {
    return cachedAlgorithmVersion;
  }

  const algorithm = await prisma.scoreAlgorithm.findFirst({
    select: { version: true },
    orderBy: { version: 'desc' },
  });

  if (!algorithm) {
    throw new Error('No score algorithm found');
  }

  cachedAlgorithmVersion = algorithm.version;

  return algorithm.version;
}

// convenience type for score history with elements
type ScoreHistoryWithElements = Prisma.ScoreHistoryGetPayload<{
  include: {
    ScoreHistoryElement: {
      include: {
        scoreElement: true;
      };
    };
  };
}>;

/**
 * Records a score for the given Ethos user.
 * @warning DO NOT EXPORT. It must be encapsulated by a lock to prevent concurrent calculations.
 * @param target - The Ethos user to record the score for.
 * @param score - The score value (number) to record.
 * @param elements - The raw score elements included in the score
 * @param errors - Any errors in elements that occurred while calculating the score
 * @returns The created score history record
 */
async function updateScore(target: EthosUserTarget, txHash?: string): Promise<ScoreHistory> {
  const targetKey = await findScoreTargetKey(target);
  const currentVersion = await getScoreAlgoVersion();

  calculationLock.set(targetKey, true);
  try {
    const startTime = Date.now();
    const newScore = await calculateNewScore(target);
    const duration = Date.now() - startTime;
    scoreCalculationDuration.observe({ target_type: getTargetType(target) }, duration);

    const latest = await getLatestScoreWithElements(targetKey);

    // If score hasn't changed and isn't dirty, reuse existing record
    if (shouldReuseExistingScore(latest, newScore, currentVersion)) {
      // Add type guard to ensure latest is not null
      if (!latest) throw new Error('Unexpected null latest score after reuse check');

      return latest;
    }

    return await createNewScoreRecord(targetKey, newScore, latest, txHash);
  } finally {
    // this should be the ONLY place that deletes the lock
    calculationLock.delete(targetKey);
  }
}

async function getLatestScoreWithElements(
  targetKey: string,
): Promise<ScoreHistoryWithElements | null> {
  return await prisma.scoreHistory.findFirst({
    where: { target: targetKey },
    orderBy: { createdAt: 'desc' },
    include: {
      ScoreHistoryElement: {
        include: {
          scoreElement: true,
        },
      },
    },
  });
}

function shouldReuseExistingScore(
  latest: ScoreHistoryWithElements | null,
  newScore: ScoreCalculationResults,
  currentVersion: number,
): boolean {
  if (!latest) return false;

  // check if the previous score elements use the current score algorithm version
  for (const element of latest?.ScoreHistoryElement ?? []) {
    if (element.scoreElement.version !== currentVersion) {
      return false;
    }
  }

  // check if the previous score and the new score are the same
  if (latest.score !== newScore.score) return false;
  // check if the previous score is not dirty
  if (latest.dirty) return false;

  return true;
}

async function createNewScoreRecord(
  targetKey: string,
  newScore: ScoreCalculationResults,
  latest: ScoreHistoryWithElements | null,
  txHash?: string,
): Promise<ScoreHistory> {
  return await prisma.$transaction(async (tx) => {
    const version = await getScoreAlgoVersion();
    const elementRecords = await createOrReuseElements(tx, newScore, latest, version);

    return await createScoreHistory(tx, {
      targetKey,
      score: newScore.score,
      dirty: newScore.errors.length > 0,
      txHash,
      elementRecords: elementRecords.map((record) => ({ id: record.id })),
    });
  });
}

async function createOrReuseElements(
  tx: Prisma.TransactionClient,
  newScore: ScoreCalculationResults,
  latest: ScoreHistoryWithElements | null,
  version: number,
): Promise<ScoreElementRecord[]> {
  const results: ScoreElementRecord[] = [];

  for (const name in newScore.elements) {
    const element = newScore.elements[name];
    const latestElement = findLatestElementByName(latest, name);

    if (latestElement && shouldReuseElement(latestElement, element)) {
      results.push(latestElement);
    } else {
      results.push(await createNewElement(tx, name, element, newScore.metadata[name], version));
    }
  }

  return results;
}

function findLatestElementByName(
  latest: ScoreHistoryWithElements | null,
  name: string,
): ScoreElementRecord | undefined {
  return latest?.ScoreHistoryElement.find((she) => she.scoreElement.name === name)?.scoreElement;
}

function shouldReuseElement(
  latestElement: { raw: number; weighted: number; error: boolean } | undefined,
  element: ElementResult,
): boolean {
  return Boolean(
    latestElement &&
      latestElement.raw === element.raw &&
      latestElement.weighted === element.weighted &&
      latestElement.error === element.error,
  );
}

async function createNewElement(
  tx: Prisma.TransactionClient,
  name: string,
  element: ElementResult,
  metadata: ScoreMetadata,
  version: number,
): Promise<ScoreElementRecord> {
  return await tx.scoreElementRecord.create({
    data: {
      name,
      version,
      raw: element.error ? 0 : element.raw,
      weighted: element.weighted,
      metadata,
      error: element.error,
    },
  });
}

async function createScoreHistory(
  tx: Prisma.TransactionClient,
  params: {
    targetKey: string;
    score: number;
    dirty: boolean;
    txHash?: string;
    elementRecords: Array<{ id: number }>;
  },
): Promise<ScoreHistory> {
  return await tx.scoreHistory.create({
    data: {
      target: params.targetKey,
      score: params.score,
      dirty: params.dirty,
      txHash: params.txHash,
      ScoreHistoryElement: {
        create: params.elementRecords.map((element) => ({
          scoreElementId: element.id,
        })),
      },
    },
  });
}

/**
 * Calculates the score for the given Ethos user target
 *
 * Warning: if this encounters any errors in pulling external data,
 * it will return them in the errors array rather than outright failing. Make sure to
 * check the errors array to see if any errors occurred.
 *
 * Note: this involves performing many lookups, including from external services
 * and possibly pulling from scratch. Do not call it frequently; instead use
 * getLatestScore.
 * @param target - The Ethos user target to calculate the score for.
 * @returns The calculated score, underlying score elements, and any errors.
 */
async function calculateNewScore(target: EthosUserTarget): Promise<ScoreCalculationResults> {
  const targetKey = await findScoreTargetKey(target);
  const result: ScoreCalculationResults = { score: 0, elements: {}, metadata: {}, errors: [] };

  const { rootCalculation, elementDefinitions }: ScoreConfig = getDefaultScoreCalculation();
  const { elementValues, metadata, errors } = await populateUserInputs(
    elementDefinitions,
    fromUserKey(targetKey),
  );

  result.score = calculateScore(rootCalculation, elementValues).score;
  elementDefinitions.forEach((element) => {
    const raw = elementValues[element.name];
    const weighted = calculateElement(element, elementValues).score;
    const error = errors.includes(element.name);
    result.elements[element.name] = { element, raw, weighted, error };
    result.metadata[element.name] = metadata[element.name];
  });
  result.errors = errors;

  return result;
}

function getTargetType(target: EthosUserTarget): string {
  return 'profileId' in target ? 'profile' : 'service' in target ? 'service' : 'address';
}
