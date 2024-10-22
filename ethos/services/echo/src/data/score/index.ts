import { fromUserKey, toUserKey, type EthosUserTarget, type ScoreImpact } from '@ethos/domain';
import { duration } from '@ethos/helpers';
import {
  calculateElement,
  calculateScore,
  getDefaultScoreCalculation,
  type ElementName,
  type ElementResult,
  type ScoreConfig,
} from '@ethos/score';
import { Prisma, type ScoreHistory } from '@prisma/client';
import { rootLogger } from '../../common/logger';
import { metrics } from '../../common/metrics';
import { prisma, refreshView } from '../db';
import { user } from '../user/lookup';
import { populateUserInputs, simulateUserInputs } from './userLookup';

const logger = rootLogger.child({ service: 'data.score' });

// lock to prevent multiple score calculations from running concurrently
const calculationLock = new Map<string, boolean>();

const scoreCalculationDuration = metrics.makeSummary({
  name: 'score_calculation_duration',
  help: 'Duration of score calculation',
  labelNames: ['target_type'],
});

// store and lookup scores by profileId - unless they don't have a profile
async function findScoreTargetKey(target: EthosUserTarget): Promise<string> {
  const profileId = await user.getProfileId(target);

  return profileId ? toUserKey({ profileId }) : toUserKey(target);
}

type LatestScoreOptions = {
  allowDirty?: boolean;
  asyncCalculate?: boolean;
};

/**
 * Retrieves the latest score for a given ethos user target.
 *
 * @param target - The Ethos user target to look up.
 * @param allowDirty - Whether to include dirty (potentially outdated) scores. Defaults to false.
 * @param asyncCalculate - Whether to trigger an asynchronous score calculation. Defaults to false.
 * @returns The most recent ScoreHistory entry for the user, or null if none found.
 *
 * WARNING: This function is not guaranteed to return a valid score. If the score doesn't exist, or is out of date,
 * this will return null. Use getLatestScoreOrCalculate if you need to ensure a recent score.
 *
 * If asyncCalculate is true, this function will trigger a background calculation of the score
 * using getLatestScoreOrCalculate, but will still return the current latest score immediately.
 * Use this to avoid recursive re-calculations, like when calculating score elements that depend
 * on other user's scores (e.g. invitees' scores)
 */
export async function getLatestScore(
  target: EthosUserTarget,
  options?: LatestScoreOptions,
): Promise<ScoreHistory | null> {
  const targetKey = await findScoreTargetKey(target);
  const where: Prisma.ScoreHistoryWhereInput = { target: targetKey };

  if (!options?.allowDirty) {
    where.dirty = false;
  }
  const locked = calculationLock.get(targetKey);

  if (options?.asyncCalculate && !locked) {
    void getLatestScoreOrCalculate(target);
  }

  return await prisma.scoreHistory.findFirst({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Retrieves the most recent score for each target and orders the results by score.
 *
 * @param limit - The maximum number of records to retrieve.
 * @param options - Optional parameters for filtering.
 * @returns A list of the most recent score for each target, sorted by score.
 *
 * This function groups the records by target and returns the most recent record
 * based on the 'createdAt' field, sorted by the 'score' field.
 */
export async function getLatestTargetScoresSortedByScore(
  limit: number = 100,
  options?: LatestScoreOptions,
): Promise<ScoreHistory[]> {
  return await prisma.$queryRaw<ScoreHistory[]>`
      WITH unique_records_by_target AS (
          SELECT DISTINCT ON (target)
                *
          FROM score_history
          ${options?.allowDirty ? Prisma.empty : Prisma.sql`WHERE dirty = false`}
          ORDER BY target, "createdAt" DESC
      )
      SELECT *
      FROM unique_records_by_target urbt
      LEFT JOIN profile_addresses pa
        ON split_part(urbt.target, ':', 2) = pa.address
      WHERE pa.address IS  NULL
      ORDER BY urbt.score DESC
      LIMIT ${limit};
  `;
}

export async function getScoreHistory(
  target: EthosUserTarget,
  afterDate: Date,
): Promise<ScoreHistory[]> {
  const targetKey = await findScoreTargetKey(target);
  const where: Prisma.ScoreHistoryWhereInput = { target: targetKey, createdAt: { gte: afterDate } };

  return await prisma.scoreHistory.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
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
export async function getLatestScoreOrCalculate(target: EthosUserTarget): Promise<ScoreHistory> {
  const latest = await getLatestScore(target);
  // score is more than 1 day old
  const isOldScore =
    (latest?.createdAt ? latest.createdAt.valueOf() : 0) <
    Date.now() - duration(1, 'day').toMilliseconds();

  if (!latest || isOldScore) {
    return await updateScore(target);
  }

  return latest;
}

/**
 * Update the score for this provided user if it's not already in progress
 *
 * Meant to be used for asynchronous score update actions; returns nothing
 * @param target - The Ethos user target to trigger a score update for.
 */
async function triggerScoreUpdate(target: EthosUserTarget): Promise<void> {
  const targetKey = await findScoreTargetKey(target);

  // score calculation already in progress, skip
  if (calculationLock.get(targetKey)) {
    return;
  }
  calculationLock.set(targetKey, true);
  await updateScore(target, false);
}

export async function triggerScoreUpdateBulk(targets: EthosUserTarget[]): Promise<void> {
  try {
    await Promise.all(
      targets.map(async (target) => {
        await triggerScoreUpdate(target);
      }),
    );

    await refreshView('scores');
  } catch (err) {
    logger.error({ err }, 'trigger_score_update_bulk.failed');
  }
}

/**
 * Records a score for the given Ethos user.
 * @warning DO NOT EXPORT. It must be encapsulated by a lock to prevent concurrent calculations.
 * @param target - The Ethos user to record the score for.
 * @param score - The score value (number) to record.
 * @param elements - The raw score elements included in the score
 * @param errors - Any errors in elements that occurred while calculating the score
 * @returns The created score history record
 */
async function updateScore(
  target: EthosUserTarget,
  refreshScoreView: boolean = true,
): Promise<ScoreHistory> {
  const targetKey = await findScoreTargetKey(target);
  calculationLock.set(targetKey, true);
  const startTime = Date.now();
  const newScore = await calculateNewScore(target);
  const duration = Date.now() - startTime;
  scoreCalculationDuration.observe({ target_type: getTargetType(target) }, duration);
  const elementsJSON = JSON.stringify(newScore.elements);

  const latest = await prisma.scoreHistory.findFirst({
    where: { target: targetKey },
    orderBy: { createdAt: 'desc' },
  });

  let result;

  if (latest && latest.score === newScore.score) {
    result = latest;
  } else {
    result = await prisma.scoreHistory.create({
      data: {
        target: targetKey,
        score: newScore.score,
        elements: elementsJSON,
        errors: newScore.errors,
        dirty: newScore.errors.length > 0,
      },
    });
  }

  // this should be the ONLY place that deletes the lock
  calculationLock.delete(targetKey);

  if (refreshScoreView) {
    await refreshView('scores');
  }

  return result;
}

/**
 * Invalidate the entire tree of users' scores where the target users are the root inviter.
 * Walks the tree down from the specified targets recursively to leaves.
 * @param targets - The Ethos users that are the inviters.
 */
export async function invalidateScores(targets: EthosUserTarget[]): Promise<void> {
  try {
    logger.debug({ data: targets }, 'invalidate_scores initiated');
    const profileIds = await Promise.all(
      targets
        .map(async (target) => await user.getProfileId(target))
        .filter((profileId) => profileId != null),
    );

    logger.debug({ data: profileIds }, 'invalidate_scores profileIds');

    if (profileIds.length > 0) {
      const rows = await prisma.$queryRaw<Array<{ id: number }>>`
        WITH RECURSIVE profiles_tree AS (
          SELECT id
          FROM profiles
          WHERE id IN (${Prisma.join(profileIds)}) AND archived = false

          UNION ALL

          SELECT p.id
          FROM profiles p
          JOIN profiles_tree pt ON p."invitedBy" = pt.id
          WHERE archived = false AND p.id NOT IN (${Prisma.join(profileIds)})
        )
        SELECT id FROM profiles_tree
      `;

      const scoreTargetKeys = rows.map((row) => toUserKey({ profileId: row.id }));
      logger.debug({ data: scoreTargetKeys }, 'invalidate_scores scoreTargetKeys');

      if (scoreTargetKeys.length > 0) {
        await prisma.$executeRaw`
          UPDATE score_history SET dirty = true
          WHERE target IN (${Prisma.join(scoreTargetKeys)}) AND dirty = false
        `;
      }
    }
  } catch (err) {
    logger.error({ err }, 'invalidate_scores.failed');
  }
}

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
  const result: ScoreCalculationResults = { score: 0, elements: {}, errors: [] };

  const { rootCalculation, elementDefinitions }: ScoreConfig = getDefaultScoreCalculation();
  const { elementValues, errors } = await populateUserInputs(
    elementDefinitions,
    fromUserKey(targetKey),
  );

  result.score = calculateScore(rootCalculation, elementValues).score;
  elementDefinitions.forEach((element) => {
    const raw = elementValues[element.name];
    const weighted = calculateElement(element, elementValues).score;
    const error = errors.includes(element.name);
    result.elements[element.name] = { element, raw, weighted, error };
  });
  result.errors = errors;

  return result;
}

/**
 * Simulates the score for the given Ethos user target
 *
 * Warning: if this encounters any errors in pulling external data,
 * it will return them in the errors array rather than outright failing. Make sure to
 * check the errors array to see if any errors occurred.
 *
 * Note: this involves performing many lookups, including from external services
 * and possibly pulling from scratch. Do not call it frequently; instead use
 * getLatestScore.
 * @param target - The Ethos user target to calculate the score for.
 * @param simulatedInput - The score parameters that should be overwritten.
 * @returns The calculated score, underlying score elements, and any errors.
 */
export async function simulateNewScore(
  target: EthosUserTarget,
  simulatedInput: Record<string, number>,
): Promise<ScoreCalculationResults> {
  const result: ScoreCalculationResults = { score: 0, elements: {}, errors: [] };
  const targetKey = await findScoreTargetKey(target);

  const { rootCalculation, elementDefinitions }: ScoreConfig = getDefaultScoreCalculation();
  const { elementValues, errors } = await simulateUserInputs(
    simulatedInput,
    elementDefinitions,
    fromUserKey(targetKey),
  );

  result.score = calculateScore(rootCalculation, elementValues).score;
  elementDefinitions.forEach((element) => {
    const raw = elementValues[element.name];
    const weighted = calculateElement(element, elementValues).score;
    const error = errors.includes(element.name);
    result.elements[element.name] = { element, raw, weighted, error };
  });
  result.errors = errors;

  return result;
}

function getTargetType(target: EthosUserTarget): string {
  return 'profileId' in target ? 'profile' : 'service' in target ? 'service' : 'address';
}
