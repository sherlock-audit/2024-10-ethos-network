import { isAlchemyRateLimitError } from '@ethos/blockchain-manager';
import { type TypeChainCommon } from '@ethos/contracts';
import { type EthosUserTarget } from '@ethos/domain';
import { duration } from '@ethos/helpers';
import { type Logger } from '@ethos/logger';
import { type Log, type LogDescription } from 'ethers';
import { prisma } from '../data/db';
import {
  eventProcessingDuration,
  eventsFailedCounter,
  eventsFoundCounter,
  eventsIgnoredCounter,
  eventsNotFoundCounter,
  eventsProcessedSummary,
  eventsRateLimitedCounter,
  invalidatedScoresCounter,
  invalidEventsCounter,
} from './event-metrics';
import { createScoreCalculationJob } from './message-queue';
import { CONTRACT_EVENT_PROCESSOR_MAP, interpretError } from '.';

const DEFAULT_IGNORE_EVENTS = new Set([
  'RoleAdminChanged',
  'RoleGranted',
  'RoleRevoked',
  'Paused',
  'Unpaused',
  'Initialized',
  'Upgraded',
]);

const ALCHEMY_API_BLOCK_RANGE_LIMIT = 2000;
const BLOCK_POLL_OFFSET = 20_000_000;
const ALCHEMY_RATE_LIMIT_WAIT_TIME = duration(1.5, 'seconds').toMilliseconds();

export type EventProcessor<Wrangled, Payload> = {
  ignoreEvents: Set<string>;
  getLogs: (fromBlock: number, toBlock?: number) => Promise<Log[]>;
  parseLog: (log: Log) => LogDescription | null;
  eventWrangler: (parsed: LogDescription) => Wrangled | null;
  preparePayload: (
    events: Array<Event<Wrangled>>,
    logger: Logger,
  ) => Promise<{ payload: Payload; dirtyScoreTargets: EthosUserTarget[] }>;
  submitPayload: (payload: Payload) => Promise<void>;
};

type Event<T> = {
  id: number;
  txHash: string;
  wrangled: T;
};

export type WrangledEvent<K extends string, T extends TypeChainCommon.TypedLogDescription<any>> = {
  name: K;
} & Omit<T, 'name'>;

export const pollEvents = async <E, Payload>(
  logger: Logger,
  contract: string,
  eventProcessor: EventProcessor<E, Payload>,
  currentBlockNumber?: number,
): Promise<void> => {
  logger.debug('event_poll_begin');

  const blockNumber = await prisma.blockchainEvent
    .findFirst({
      where: { contract },
      orderBy: [{ blockNumber: 'desc' }],
    })
    .then((x) => x?.blockNumber ?? 0);

  let blockPollOffset = BLOCK_POLL_OFFSET;
  let fromBlockNumber = blockNumber !== null ? blockNumber + 1 : 0;
  let toBlockNumber = fromBlockNumber + blockPollOffset;
  const blockLimit = currentBlockNumber ?? fromBlockNumber + ALCHEMY_API_BLOCK_RANGE_LIMIT;

  let events: Log[] = [];

  while (fromBlockNumber <= blockLimit) {
    try {
      logger.trace(
        `retrieving logs from ${fromBlockNumber} to ${toBlockNumber}... until ${blockLimit}`,
      );
      const logs = await eventProcessor.getLogs(fromBlockNumber, toBlockNumber);
      events = events.concat(logs);

      // increase again after an eventual reduction
      blockPollOffset = Math.min(blockPollOffset * 2, BLOCK_POLL_OFFSET);

      fromBlockNumber = toBlockNumber + 1;
      toBlockNumber += Math.min(blockPollOffset, blockLimit);
    } catch (e) {
      if (e instanceof Error && e.message.includes('Log response size exceeded.')) {
        blockPollOffset /= 2;
        toBlockNumber = fromBlockNumber + blockPollOffset;
        continue;
      } else {
        logger.error(e);
        break;
      }
    }
  }

  if (events.length === 0) {
    eventsNotFoundCounter.inc({ contract });
    logger.trace({ data: { blockNumber, eventCount: events.length } }, 'no_new_events');

    return;
  }

  eventsFoundCounter.observe({ contract }, events.length);
  logger.info({ data: { blockNumber, eventCount: events.length } }, 'found_new_events');
  await prisma.blockchainEvent.createMany({
    data: events.map((x) => ({
      contract,
      logData: x.toJSON(),
      blockNumber: x.blockNumber,
      blockIndex: x.index,
      createdAt: new Date(),
      txHash: x.transactionHash,
    })),
  });

  logger.debug('event_poll_end');
};

export async function processEvent(logger: Logger, eventId: number): Promise<void> {
  const event = await prisma.blockchainEvent.findUnique({
    where: { id: eventId },
  });

  if (event === null) {
    logger.warn({ data: { eventId } }, 'missing_event');

    return;
  }

  logger = logger.child({ module: `contract-events/${event.contract}` });

  // create closure for logging duration
  const process = async (): Promise<void> => {
    const contract = event.contract;
    const eventProcessor = CONTRACT_EVENT_PROCESSOR_MAP[contract];

    if (eventProcessor === undefined) {
      logger.warn({ data: { event } }, 'missing_event_processor');

      return;
    }

    const parsed = eventProcessor.parseLog(event.logData as unknown as Log);

    if (parsed === null) {
      logger.warn({ data: { event } }, 'invalid_event');
      invalidEventsCounter.inc({ contract });

      return;
    }

    if (DEFAULT_IGNORE_EVENTS.has(parsed.name) || eventProcessor.ignoreEvents.has(parsed.name)) {
      await markAsProcessed(event.id);
      eventsIgnoredCounter.inc({ contract });

      return;
    }

    const wrangledEvent = eventProcessor.eventWrangler(parsed);

    if (!wrangledEvent) {
      logger.warn({ data: { parsed, event } }, 'unhandled_event');
      invalidEventsCounter.inc({ contract });

      return;
    }

    try {
      const { payload, dirtyScoreTargets } = await eventProcessor.preparePayload(
        [{ id: event.id, txHash: event.txHash, wrangled: wrangledEvent }],
        logger,
      );
      await eventProcessor.submitPayload(payload);
      await markAsProcessed(event.id);

      for (const target of dirtyScoreTargets) {
        await createScoreCalculationJob(target);
      }

      eventsProcessedSummary.observe({ contract }, 1);
      invalidatedScoresCounter.inc({ contract }, dirtyScoreTargets.length);
    } catch (err) {
      if (isAlchemyRateLimitError(err)) {
        eventsRateLimitedCounter.inc({ contract });
        logger.info({ data: { wrangledEvent } }, 'alchemy_rate_limit_reached');
        // Alchemy per-second rate limit reached; wait and try again
        await new Promise((resolve) => setTimeout(resolve, ALCHEMY_RATE_LIMIT_WAIT_TIME));
      } else {
        eventsFailedCounter.inc({ contract });
        logger.error(
          {
            err,
            data: { parsedError: interpretError(err), wrangledEvent },
          },
          'failed_event_processing',
        );
      }

      throw err;
    }
  };

  logger.debug('event_process_begin');
  const startTime = Date.now();

  await process();

  const duration = Date.now() - startTime;
  eventProcessingDuration.observe({ contract: event.contract }, duration);
  logger.debug('event_process_end');
}

async function markAsProcessed(eventId: number): Promise<void> {
  await prisma.blockchainEvent.update({
    data: {
      processed: true,
    },
    where: {
      id: eventId,
    },
  });
}
