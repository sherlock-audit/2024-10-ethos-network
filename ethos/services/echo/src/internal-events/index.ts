import { type RedlockAbortSignal } from 'redlock2';
import { CronJobManager } from '../common/cron.js';
import { createHourlyEthosJob } from '../contract-events/message-queue.js';

const CRON_EXPRESSION_EVERY_HOUR = '0 * * * *';
const INTERNAL_ETHOS_EVENTS_LOCK = ['internal-ethos-events-lock'];

const job = new CronJobManager(
  CRON_EXPRESSION_EVERY_HOUR,
  INTERNAL_ETHOS_EVENTS_LOCK,
  'internal-events',
  async (signal: RedlockAbortSignal) => {
    await job.executeJob(signal, async () => {
      await createHourlyEthosJob();
    });
  },
);

export const startInternalEventsJob = job.start.bind(job);
export const stopInternalEventsJob = job.stop.bind(job);
