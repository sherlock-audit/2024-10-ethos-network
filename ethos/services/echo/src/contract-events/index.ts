import { type Contract } from '@ethos/contracts';
import { JsonHelper } from '@ethos/helpers';
import { Contract as PrismaContract } from '@prisma-pg/client';
import { type ContractEventPayload, type Log } from 'ethers';
import { type RedlockAbortSignal } from 'redlock2';
import { getAddress } from 'viem';
import { blockchainManager } from '../common/blockchain-manager.js';
import { CronJobManager } from '../common/cron.js';
import { rootLogger } from '../common/logger.js';
import { FEATURE_GATES, getGlobalFeatureGate } from '../common/statsig.js';
import { prisma } from '../data/db.js';
import { redlock } from '../data/redis.js';
import { attestationEventProcessor } from './attestation.js';
import { discussionEventProcessor } from './discussion.js';
import { contractEventsListenedCounter } from './event-metrics.js';
import {
  type EventProcessor,
  pollEvents,
  processEvent,
  tryCreateBlockchainEvent,
} from './event-processing.js';
import { run as updateEventTypes } from './event-type.js';
import { marketEventProcessor } from './market.js';
import { createBlockchainEventJob, createBlockchainEventJobs } from './message-queue.js';
import { profileEventProcessor } from './profile.js';
import { reviewEventProcessor } from './review.js';
import { voteEventProcessor } from './vote.js';
import { vouchEventProcessor } from './vouch.js';

const logger = rootLogger.child({ module: 'contract-events' });

const CRON_EXPRESSION_EVERY_MINUTE = '* * * * *';

type ContractEventProcessor = {
  contract: Contract;
  eventProcessor: EventProcessor<any, any>;
};

const CONTRACT_EVENT_PROCESSORS: ContractEventProcessor[] = [
  { contract: 'profile', eventProcessor: profileEventProcessor },
  { contract: 'review', eventProcessor: reviewEventProcessor },
  { contract: 'vouch', eventProcessor: vouchEventProcessor },
  { contract: 'discussion', eventProcessor: discussionEventProcessor },
  { contract: 'vote', eventProcessor: voteEventProcessor },
  { contract: 'attestation', eventProcessor: attestationEventProcessor },
  { contract: 'reputationMarket', eventProcessor: marketEventProcessor },
];

export const CONTRACT_EVENT_PROCESSOR_MAP = CONTRACT_EVENT_PROCESSORS.reduce<
  Partial<Record<string, EventProcessor<any, any>>>
>((map, value) => {
  map[value.contract] = value.eventProcessor;

  return map;
}, {});

const EVENT_PROCESSING_LOCK = ['event-processing-lock'];
const job = new CronJobManager(
  CRON_EXPRESSION_EVERY_MINUTE,
  EVENT_PROCESSING_LOCK,
  'contract-events',
  async (signal: RedlockAbortSignal) => {
    await job.executeJob(signal, async () => {
      if (getGlobalFeatureGate(FEATURE_GATES.CONTRACT_EVENTS_BATCH_JOB)) {
        logger.info('contract-events.batch_job.disabled');

        return;
      }
      const latestBlockNumber =
        await blockchainManager.contractAddressManager.contractRunner.provider?.getBlockNumber();

      for (const { contract, eventProcessor } of CONTRACT_EVENT_PROCESSORS) {
        // Check for job abortion between contract event polling
        // This ensures we can gracefully stop processing if the job is aborted,
        // rather than waiting until all contract events are processed
        if (signal.aborted) {
          if (signal.error) throw signal.error;
          logger.warn('contract-events.batch_job.aborted');

          return;
        }

        await pollEvents(
          logger.child({ module: `contract-events/${contract}` }),
          contract,
          eventProcessor,
          latestBlockNumber,
        );
      }

      await createBlockchainEventJobs();
    });
  },
);

export const startContractEventsBatchJob = job.start.bind(job);
export const stopContractEventsBatchJob = job.stop.bind(job);

export async function updateEventTypesTask(): Promise<void> {
  logger.info('updateEventTypes.started');
  await updateEventTypes();
  logger.info('updateEventTypes.ended');
}

export async function checkIfEventExistsAndWasProcessed(txHash: string): Promise<boolean> {
  return (
    (await prisma.blockchainEvent.count({
      where: {
        txHash,
        processed: true,
      },
    })) > 0
  );
}

export async function spotProcessEvent(txHash: string): Promise<boolean> {
  if (await checkIfEventExistsAndWasProcessed(txHash)) {
    return true;
  }

  const { transaction } = await blockchainManager
    .getTransactionReceiptByHash(txHash)
    .catch((err) => {
      logger.warn({ err }, 'contract-events.failed_to_get_transaction_receipt');

      return { transaction: null };
    });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  // TODO: Need to go through all the logs or identify which of them are of interest to us
  // We need to identify the events that we know by topic number
  const event: { log: Log } = {
    log: transaction?.logs[transaction?.logs.length - 1],
  };

  if (!event.log) {
    throw new Error('Log not found');
  }

  const contract = blockchainManager.getContractName(getAddress(event.log.address));

  if (!contract) {
    throw new Error('Smart contract not recognized');
  }

  let dbEvent = await tryCreateBlockchainEvent(logger, {
    contract,
    logData: event.log.toJSON(),
    blockNumber: event.log.blockNumber,
    blockIndex: event.log.index,
    createdAt: new Date(),
    txHash: event.log.transactionHash,
    processed: false,
    jobCreated: true,
  });

  if (dbEvent === null) {
    dbEvent = await prisma.blockchainEvent.findFirst({
      where: {
        txHash: event.log.transactionHash,
      },
    });
  }

  if (!dbEvent) {
    throw new Error('Event not found in the database');
  }

  // process event
  if (dbEvent && !dbEvent?.processed) {
    await processEvent(logger, dbEvent.id ?? 0);
  } else {
    logger.debug(
      { data: { contract, txHash: event.log.transactionHash } },
      'event_listener_process',
    );
  }

  // check whether the event was processed

  return await checkIfEventExistsAndWasProcessed(txHash);
}

/**
 * Handles Ethos blockchain events asynchronously. Used as a callback for event listeners.
 *
 * This function processes incoming blockchain events, saves them to the database,
 * and triggers the appropriate event processor. It uses a distributed lock to
 * ensure exclusive access during processing.
 *
 * Design note: this function is in index.ts so that it's in the same scope as the
 * lock and processors, avoiding needing to share lock state between contexts
 *
 * @param {...any} args - Variable number of arguments. The last argument is expected
 *                        to be the ContractEventPayload.
 * @returns {void}
 *
 * @async
 * @function handleEthosEvent
 */
export function handleEthosEvent(...args: any): void {
  // Asynchronous execution without waiting for completion
  void (async () => {
    await redlock
      .using(EVENT_PROCESSING_LOCK, 5000, async (signal: RedlockAbortSignal) => {
        if (signal.aborted) {
          if (signal.error) throw signal.error;
          logger.warn('contract-events.listeners.handleEthosEvent.aborted');

          return;
        }
        try {
          const event: ContractEventPayload = args.at(-1);
          const contract = blockchainManager.getContractName(getAddress(event.log.address));
          const eventProcessor = CONTRACT_EVENT_PROCESSORS.find(
            (p) => p.contract === contract,
          )?.eventProcessor;

          if (!eventProcessor) {
            logger.error(
              { data: { contract, address: event.log.address } },
              'contract-events.listeners.handleEthosEvent.no-processor',
            );

            return;
          }

          logger.debug(
            { data: { contract, txnHash: event.log.transactionHash } },
            'event_listener_save',
          );

          const dbEvent = await tryCreateBlockchainEvent(logger, {
            contract,
            logData: event.log.toJSON(),
            blockNumber: event.log.blockNumber,
            blockIndex: event.log.index,
            createdAt: new Date(),
            txHash: event.log.transactionHash,
            processed: false,
            jobCreated: true,
          });

          if (dbEvent === null) return;

          logger.debug(
            { data: { contract, txnHash: event.log.transactionHash } },
            'event_listener_process',
          );
          contractEventsListenedCounter.inc({ contract });
          await createBlockchainEventJob(dbEvent.id);
        } catch (err) {
          logger.error({ err }, 'contract-events.listeners.handleEthosEvent.error');
        }
      })
      .catch((err) => {
        CronJobManager.handleRedlockError(EVENT_PROCESSING_LOCK, interpretError(err), err);
      });
  })();
}

/**
 * Interprets and formats error messages from contract event processing.
 *
 * @param err - The error object to interpret. Can be of any type.
 * @returns A formatted error message as a string or null.
 */
export function interpretError(err: any): string | null {
  if (err.code === 'CALL_EXCEPTION') {
    const parsedError = blockchainManager.parseError(err);

    return parsedError
      ? JSON.stringify(parsedError, JsonHelper.replacer)
      : `Unknown Contract CALL_EXCEPTION: ${err.message}`;
  }

  return null;
}

export function toPrismaContract(contract: Contract): PrismaContract | null {
  switch (contract) {
    case 'profile':
      return PrismaContract.PROFILE;
    case 'vouch':
      return PrismaContract.VOUCH;
    case 'review':
      return PrismaContract.REVIEW;
    case 'attestation':
      return PrismaContract.ATTESTATION;
    case 'discussion':
      return PrismaContract.DISCUSSION;
  }

  return null;
}
