import {
  isLookupInterval,
  elementRange,
  getDefaultScoreCalculation,
  type ScoreElement,
} from '@ethos/score';
import { type Prisma, type ScoreAlgorithm } from '@prisma-pg/client';
import { isEqual } from 'lodash-es';
import { rootLogger } from '../../common/logger.js';
import { prisma } from '../db.js';

const logger = rootLogger.child({ service: 'data.score.version' });

/**
 * Checks if the score algorithm definition has changed.
 * If so, stores the latest version in the database.
 *
 * This only needs to be done once on startup by the primary process.
 * (Unless we allow dynamically updating the score definition in the future.)
 */
export async function checkLatestScoreVersion(): Promise<void> {
  const parsedScoreConfig = getDefaultScoreCalculation();
  const rawScoreConfig = JSON.stringify(parsedScoreConfig);
  const latestVersion = await prisma.scoreAlgorithm.findFirst({
    orderBy: { version: 'desc' },
  });

  if (!latestVersion) {
    await createNewScoreVersion(rawScoreConfig, parsedScoreConfig);

    return;
  }

  const configsAreDifferent = !isEqual(latestVersion.definition, rawScoreConfig);

  if (configsAreDifferent) await createNewScoreVersion(rawScoreConfig, parsedScoreConfig);
}

/**
 * Creates a new score algorithm version in the database with the provided config
 */
async function createNewScoreVersion(
  rawScoreConfig: string,
  parsedScoreConfig: { elementDefinitions: ScoreElement[] },
): Promise<ScoreAlgorithm> {
  const newVersion = await prisma.scoreAlgorithm.create({
    data: {
      definition: rawScoreConfig,
      ScoreElementDefinition: {
        createMany: {
          data: mapScoreElementsToPrisma(parsedScoreConfig.elementDefinitions),
        },
      },
    },
  });
  logger.info({ data: { version: newVersion.version } }, 'created_score_algorithm');

  return newVersion;
}

/**
 * Converts score elements into the format required by Prisma for database storage
 */
function mapScoreElementsToPrisma(
  elementDefinitions: ScoreElement[],
): Prisma.ScoreElementDefinitionCreateManyScoreAlgorithmInput[] {
  return elementDefinitions.map((element) => {
    const { name, type } = element;
    const { min, max } = elementRange(element);

    const ranges = isLookupInterval(element) ? JSON.parse(JSON.stringify(element.ranges)) : null;
    const outOfRangeScore = isLookupInterval(element) ? element.outOfRangeScore : null;

    return { name, type, min, max, ranges, outOfRangeScore };
  });
}
