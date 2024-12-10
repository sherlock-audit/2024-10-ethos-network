import { setTimeout } from 'node:timers/promises';
import { config } from './common/config.js';
import { rootLogger as logger } from './common/logger.js';
import { FEATURE_GATES, getGlobalFeatureGate } from './common/statsig.js';

import { ContractEventListeners } from './contract-events/event-listeners.js';
import {
  startContractEventsBatchJob,
  stopContractEventsBatchJob,
  updateEventTypesTask,
} from './contract-events/index.js';
import {
  processBlockchainEventJobs,
  processScoreCalculationJobs,
} from './contract-events/message-queue.js';
import { stopMetricsServer } from './metrics-server.js';

const blockchainEventListener = new ContractEventListeners();

export async function startEventServer(): Promise<void> {
  if (getGlobalFeatureGate(FEATURE_GATES.UPDATE_DB_EVENT_TYPES)) {
    updateEventTypesTask().catch((err) => {
      logger.error({ err }, 'Failed to start update event types task');
    });
  }

  startContractEventsBatchJob().catch((err) => {
    logger.fatal({ err }, 'Failed to start contract events batch job');
    process.exit(1);
  });
  blockchainEventListener.start().catch((err) => {
    logger.fatal({ err }, 'Failed to start contract events listener');
    process.exit(1);
  });

  await processBlockchainEventJobs();
  await processScoreCalculationJobs();
}

export async function stopEventServer(): Promise<void> {
  await stopContractEventsBatchJob().catch((err) => {
    logger.fatal({ err }, 'Failed to stop contract events batch job');
    process.exit(1);
  });
  await blockchainEventListener.stop().catch((err) => {
    logger.fatal({ err }, 'Failed to stop contract events listener');
    process.exit(1);
  });
  stopMetricsServer();

  // Make sure we wait for all the connections to close on production.
  // Otherwise, exit almost immediately.
  await setTimeout(config.NODE_ENV === 'production' ? 3000 : 500);

  process.exit(0);
}
