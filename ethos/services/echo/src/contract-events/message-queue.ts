import { type EthosUserTarget } from '@ethos/domain';
import { JsonHelper } from '@ethos/helpers';
import amqp, { type ChannelWrapper } from 'amqp-connection-manager';
import type amqplib from 'amqplib';
import { config } from '../common/config.js';
import { rootLogger } from '../common/logger.js';
import { prisma } from '../data/db.js';
import { triggerScoreUpdate } from '../data/score/calculate.js';
import { type HourlyEthosJob } from '../internal-events/daily.score.update.js';
import { RESET_PROFILE_SCORES, resetProfileScores } from '../jobs/daily-vouch-score.js';
import { CALCULATE_VOUCH_POINTS, calculateVouchPoints } from '../jobs/daily-vouch-xp.js';
import { processEvent } from './event-processing.js';

const logger = rootLogger.child({ module: 'message-queue' });

const BLOCKCHAIN_QUEUE_NAME = 'blockchain_event_processing';
const DEAD_LETTER_BLOCKCHAIN_QUEUE_NAME = 'dead_letter_blockchain_event_processing';
const MAX_ATTEMPTS = 5;

const SCORE_CALCULATION_QUEUE_NAME = 'score_calculation';
const INTERNAL_ETHOS_QUEUE_NAME = 'internal_ethos_events';

export async function createBlockchainEventJobs(): Promise<void> {
  const events = await prisma.blockchainEvent.findMany({
    select: { id: true },
    where: { jobCreated: false },
    orderBy: [{ blockNumber: 'asc' }, { blockIndex: 'asc' }],
  });

  for (const event of events) {
    await createBlockchainEventJob(event.id);

    await prisma.blockchainEvent.update({
      where: { id: event.id },
      data: { jobCreated: true },
    });
  }
}

const connection = amqp.connect(config.AMQP_URL + '?heartbeat=60');
connection.on('connect', () => {
  logger.info('AMQP connected');
});
connection.on('disconnect', () => {
  logger.info('AMQP disconnected');
});

const channel = connection.createChannel({
  json: true,
  setup: async (channel: amqplib.Channel) => {
    await channel.prefetch(1);
    await channel.assertQueue(DEAD_LETTER_BLOCKCHAIN_QUEUE_NAME, {
      durable: true,
      arguments: {
        'x-queue-type': 'quorum',
      },
    });
    await channel.assertQueue(BLOCKCHAIN_QUEUE_NAME, {
      durable: true,
      deadLetterExchange: '',
      deadLetterRoutingKey: DEAD_LETTER_BLOCKCHAIN_QUEUE_NAME,
      arguments: {
        'x-queue-type': 'quorum',
        'x-single-active-consumer': true,
        // retry limit
        'x-delivery-limit': MAX_ATTEMPTS - 1,
      },
    });

    await channel.assertQueue(SCORE_CALCULATION_QUEUE_NAME, {
      durable: true,
      arguments: {
        'x-queue-type': 'quorum',
        // retry limit
        'x-delivery-limit': 0,
      },
    });
    await channel.assertQueue(INTERNAL_ETHOS_QUEUE_NAME, {
      durable: true,
      arguments: {
        'x-queue-type': 'classic',
      },
    });
  },
});

function processMessage<T>(
  channel: ChannelWrapper,
  msg: amqplib.ConsumeMessage | null,
  fn: (payload: T) => Promise<void>,
): void {
  if (msg) {
    const payload = JsonHelper.parseSafe<T>(msg.content.toString());

    if (!payload) {
      channel.nack(msg, false, false);

      return;
    }

    void (async () => {
      try {
        await fn(payload);
        channel.ack(msg);
      } catch (err) {
        channel.nack(msg);
      }
    })();
  }
}

type BlockchainEventJob = {
  eventId: number;
};

export async function createBlockchainEventJob(eventId: number): Promise<void> {
  const payload: BlockchainEventJob = { eventId };
  await channel.sendToQueue(BLOCKCHAIN_QUEUE_NAME, payload);
}

export async function processBlockchainEventJobs(): Promise<void> {
  await channel.consume(BLOCKCHAIN_QUEUE_NAME, (msg) => {
    processMessage<BlockchainEventJob>(channel, msg, async (payload) => {
      await processEvent(logger, payload.eventId);
    });
  });
}

type ScoreCalculationJob = {
  target: EthosUserTarget;
  txHash?: string;
};

export async function createScoreCalculationJob(
  target: EthosUserTarget,
  txHash?: string,
): Promise<void> {
  const payload: ScoreCalculationJob = { target, txHash };
  await channel.sendToQueue(SCORE_CALCULATION_QUEUE_NAME, payload);
}

export async function processScoreCalculationJobs(): Promise<void> {
  await channel.consume(SCORE_CALCULATION_QUEUE_NAME, (msg) => {
    processMessage<ScoreCalculationJob>(channel, msg, async (payload) => {
      await triggerScoreUpdate(payload.target, payload.txHash);
    });
  });
}

export async function createHourlyEthosJob(): Promise<void> {
  const vouchXpJob: HourlyEthosJob = { job: CALCULATE_VOUCH_POINTS };
  const resetVouchedProfilesJob: HourlyEthosJob = { job: RESET_PROFILE_SCORES };
  await channel.sendToQueue(INTERNAL_ETHOS_QUEUE_NAME, vouchXpJob);
  await channel.sendToQueue(INTERNAL_ETHOS_QUEUE_NAME, resetVouchedProfilesJob);
}

export async function processHourlyEthosJobs(): Promise<void> {
  await channel.consume(INTERNAL_ETHOS_QUEUE_NAME, (msg) => {
    processMessage<HourlyEthosJob>(channel, msg, async (payload) => {
      switch (payload.job) {
        case CALCULATE_VOUCH_POINTS:
          void calculateVouchPoints();
          break;
        case RESET_PROFILE_SCORES:
          void resetProfileScores();
          break;
      }
    });
  });
}
