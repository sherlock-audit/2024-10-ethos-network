import { rootLogger as logger } from './common/logger';
import { prisma } from './data/db';

export async function executePostMigrationScripts(): Promise<void> {
  logger.info('Running post-migration scripts');

  /**
    Postgres requires that create concurrent indexes occur outside transactions, otherwise it throws the error:
    ERROR:  CREATE INDEX CONCURRENTLY cannot run inside a transaction block

    SQL state: 25001
    */
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS targets_unique_id_target_idx ON targets (ID, TARGET)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS targets_id_idx ON targets (ID)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS targets_target_idx ON targets (TARGET)`,
  );

  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS names_unique_id_target_idx ON names (ID, TARGET)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS names_id_idx ON names (ID)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS names_target_idx ON names (TARGET)`,
  );

  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS scores_unique_id_target_idx ON scores (ID, TARGET)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS scores_id_idx ON scores (ID)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS scores_target_idx ON scores (TARGET)`,
  );

  logger.info('Post-migration scripts completed.');
}
