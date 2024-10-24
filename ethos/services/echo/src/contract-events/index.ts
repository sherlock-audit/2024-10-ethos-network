import { type Contract } from '@ethos/contracts';
import { duration, JsonHelper } from '@ethos/helpers';
import { Contract as PrismaContract } from '@prisma/client';
import { CronJob } from 'cron';
import { type ContractEventPayload, type Log } from 'ethers';
import { ExecutionError, ResourceLockedError } from 'redlock';
import { getAddress } from 'viem';
import { blockchainManager } from '../common/blockchain-manager';
import { rootLogger } from '../common/logger';
import { FEATURE_GATES, getGlobalFeatureGate } from '../common/statsig';
import { prisma } from '../data/db';
import { redlock } from '../data/redis';
import { attestationEventProcessor } from './attestation';
import { discussionEventProcessor } from './discussion';
import { escrowEventProcessor } from './escrow';
import { contractEventsListenedCounter, resourceLockedCounter } from './event-metrics';
import { type EventProcessor, pollEvents, processEvent } from './event-processing';
import { run as updateEventTypes } from './event-type';
import { marketEventProcessor } from './market';
import { createBlockchainEventJob, createBlockchainEventJobs } from './message-queue';
import { profileEventProcessor } from './profile';
import { reviewEventProcessor } from './review';
import { voteEventProcessor } from './vote';
import { vouchEventProcessor } from './vouch';

const logger = rootLogger.child({ module: 'contract-events' });

const CRON_EXPRESSION_EVERY_MINUTE = '* * * * *';
const LOCK_DURATION = duration(30, 'seconds').toMilliseconds();

type ContractEventProcessor = {
  contract: Contract;
  eventProcessor: EventProcessor<any, any>;
};

const CONTRACT_EVENT_PROCESSORS: ContractEventProcessor[] = [
  { contract: 'profile', eventProcessor: profileEventProcessor },
  { contract: 'review', eventProcessor: reviewEventProcessor },
  { contract: 'vouch', eventProcessor: vouchEventProcessor },
  { contract: 'discussion', eventProcessor: discussionEventProcessor },
  { contract: 'escrow', eventProcessor: escrowEventProcessor },
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
const job = new CronJob(CRON_EXPRESSION_EVERY_MINUTE, async () => {
  await redlock
    .using(EVENT_PROCESSING_LOCK, LOCK_DURATION, async (signal) => {
      try {
        const latestBlockNumber =
          await blockchainManager.contractAddressManager.contractRunner.provider?.getBlockNumber();

        for (const { contract, eventProcessor } of CONTRACT_EVENT_PROCESSORS) {
          if (signal.aborted && signal.error) {
            throw signal.error;
          }

          await pollEvents(
            logger.child({ module: `contract-events/${contract}` }),
            contract,
            eventProcessor,
            latestBlockNumber,
          );
        }
      } catch (err) {
        logger.error({ err, data: { parsedError: interpretError(err) } }, 'poll_events_error');
      }

      const isDisabled = getGlobalFeatureGate(FEATURE_GATES.CONTRACT_EVENTS_BATCH_JOB);

      if (isDisabled) {
        logger.info('contract_events_batch_job_disabled');
      } else {
        await createBlockchainEventJobs();
      }
    })
    .catch(handleRedlockError);
});

export async function updateEventTypesTask(): Promise<void> {
  logger.info('updateEventTypes.started');
  await updateEventTypes();
  logger.info('updateEventTypes.ended');
}

export async function startContractEventsBatchJob(): Promise<void> {
  job.start();

  logger.info('contract-events.batch-job.started');
}

export async function stopContractEventsBatchJob(): Promise<void> {
  job.stop();

  logger.info('contract-events.batch-job.stopped');
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

  const { transaction } = await blockchainManager.getTransactionReceiptByHash(txHash);

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

  let dbEvent;
  try {
    dbEvent = await prisma.blockchainEvent.create({
      data: {
        contract,
        logData: event.log.toJSON(),
        blockNumber: event.log.blockNumber,
        blockIndex: event.log.index,
        createdAt: new Date(),
        txHash: event.log.transactionHash,
        processed: false,
        jobCreated: true,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unique constraint failed')) {
      // TODO: https://trust-ethos.atlassian.net/browse/CORE-1100
      // Reducing error volume in Sentry as this is a known issue.
      // It's not causing any bugs, as it's better to have duplicate events than to miss them.
      logger.debug(
        { data: { contract, txHash: event.log.transactionHash } },
        'contract-events.listeners.handleEthosEvent.duplicate',
      );
      dbEvent = await prisma.blockchainEvent.findFirst({
        where: {
          txHash: event.log.transactionHash,
        },
      });
    }
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
      .using(EVENT_PROCESSING_LOCK, 5000, async (signal) => {
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
          if (signal.aborted && signal.error) {
            throw signal.error;
          }
          logger.debug(
            { data: { contract, txnHash: event.log.transactionHash } },
            'event_listener_save',
          );
          try {
            const dbEvent = await prisma.blockchainEvent.create({
              data: {
                contract,
                logData: event.log.toJSON(),
                blockNumber: event.log.blockNumber,
                blockIndex: event.log.index,
                createdAt: new Date(),
                txHash: event.log.transactionHash,
                processed: false,
                jobCreated: true,
              },
            });

            logger.debug(
              { data: { contract, txnHash: event.log.transactionHash } },
              'event_listener_process',
            );
            contractEventsListenedCounter.inc({ contract });
            await createBlockchainEventJob(dbEvent.id);
          } catch (err) {
            if (err instanceof Error && err.message.includes('Unique constraint failed')) {
              // TODO: https://trust-ethos.atlassian.net/browse/CORE-1100
              // Reducing error volume in Sentry as this is a known issue.
              // It's not causing any bugs, as it's better to have duplicate events than to miss them.
              logger.debug(
                { data: { contract, txHash: event.log.transactionHash } },
                'contract-events.listeners.handleEthosEvent.duplicate',
              );
            } else {
              logger.error({ err }, 'contract-events.listeners.handleEthosEvent.create-error');
            }
          }

          if (signal.aborted && signal.error) {
            throw signal.error;
          }
        } catch (err) {
          logger.error({ err }, 'contract-events.listeners.handleEthosEvent.error');
        }
      })
      .catch(handleRedlockError);
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

function handleRedlockError(err: any): void {
  // Should only need to check ResourceLockedError, but redlock v5 has a bug https://github.com/mike-marcacci/node-redlock/issues/168
  if (err instanceof ResourceLockedError || err instanceof ExecutionError) {
    resourceLockedCounter.inc();
    logger.debug({ data: { key: EVENT_PROCESSING_LOCK } }, 'resource_locked');

    return;
  }

  logger.error({ err, data: { parsedError: interpretError(err) } }, 'cron_job_error');
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
