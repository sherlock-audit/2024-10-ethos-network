import { type EthosUserTarget, toUserKey } from '@ethos/domain';
import { type PaginatedQuery } from '@ethos/helpers';
import { type ElementName, type ElementResult } from '@ethos/score';
import { Prisma, type ScoreHistory } from '@prisma-pg/client';
import { convert } from '../conversion.js';
import { prisma } from '../db.js';
import { user } from '../user/lookup/index.js';
import { type LatestScoreOptions, type LatestScore, type ScoreHistoryRecord } from './types.js';

// store and lookup scores by profileId - unless they don't have a profile
export async function findScoreTargetKey(target: EthosUserTarget): Promise<string> {
  const profileId = await user.getProfileId(target);

  return profileId ? toUserKey({ profileId }) : toUserKey(target);
}

/**
 * Retrieves a score update resulting from a specific transaction.
 *
 * @param target - The Ethos user target to look up the score for
 * @param txHash - The transaction hash associated with the score record
 * @returns A Promise that resolves to the matching score history record, or null if not found
 *
 * This function is useful for finding a specific score calculation that was triggered
 * by a particular transaction. It can be used to verify that a transaction
 * successfully resulted in a score update.
 */
export async function getScoreByTxHash(
  target: EthosUserTarget,
  txHash: string,
): Promise<LatestScore | null> {
  return await prisma.scoreHistory.findFirst({
    where: { target: await findScoreTargetKey(target), txHash },
  });
}

type ScoreElements = Record<ElementName, ElementResult>;

export async function getScoreElements(id: number): Promise<ScoreElements | undefined> {
  const elements = await prisma.scoreHistoryElement.findMany({
    where: { scoreHistoryId: id },
    include: {
      scoreElement: {
        include: {
          ScoreElementDefinition: true,
        },
      },
    },
  });

  if (!elements.length) return undefined;

  // Convert elements to the expected format
  const formattedElements: ScoreElements = {};
  elements.forEach((record) => {
    const element = convert.toScoreElement(record);
    formattedElements[element.name] = {
      element,
      raw: record.scoreElement.raw,
      weighted: record.scoreElement.weighted,
      error: record.scoreElement.error,
    };
  });

  return formattedElements;
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
): Promise<Array<{ target: string; score: number }>> {
  return await prisma.$queryRaw<ScoreHistory[]>`
        WITH unique_records_by_target AS (
            SELECT DISTINCT ON (target)
            id, target, score
            FROM score_history
            ${options?.allowDirty ? Prisma.empty : Prisma.sql`WHERE dirty = false`}
            ORDER BY target, "createdAt" DESC
        )
        SELECT target, score
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
  pagination: PaginatedQuery,
): Promise<
  Array<
    Prisma.ScoreHistoryGetPayload<{
      select: { createdAt: true; score: true };
    }>
  >
> {
  const targetKey = await findScoreTargetKey(target);
  const where: Prisma.ScoreHistoryWhereInput = { target: targetKey, createdAt: { gte: afterDate } };

  return await prisma.scoreHistory.findMany({
    select: {
      createdAt: true,
      score: true,
      id: true,
      target: true,
    },
    where,
    orderBy: { createdAt: 'desc' },
    skip: pagination?.offset,
    take: pagination?.limit,
  });
}

export async function getDetailedScoreHistory(
  target: EthosUserTarget,
  afterDate: Date,
  pagination: PaginatedQuery,
): Promise<ScoreHistoryRecord[]> {
  const targetKey = await findScoreTargetKey(target);
  const where: Prisma.ScoreHistoryWhereInput = { target: targetKey, createdAt: { gte: afterDate } };

  const records = await prisma.scoreHistory.findMany({
    where,
    include: {
      ScoreHistoryElement: {
        include: {
          scoreElement: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: pagination.offset,
    take: pagination.limit,
  });

  return records.map(convert.toScoreHistoryRecord);
}

/**
 * Retrieves a target's score as it existed at a specific date.
 * Returns the most recent score record that existed before or at the given date.
 *
 * Note: if the date is in the future, it returns the most recent score; that's good
 * Note: dirty scores are acceptable
 * @param target - The Ethos user target to look up the score for
 * @param date - The date at which to retrieve the score
 * @returns A Promise that resolves to the score record at that date, or null if no score existed
 */
export async function getScoreAtDate(
  target: EthosUserTarget,
  date: Date,
): Promise<LatestScore | null> {
  const targetKey = await findScoreTargetKey(target);

  return await prisma.scoreHistory.findFirst({
    where: {
      target: targetKey,
      createdAt: { lte: date },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
