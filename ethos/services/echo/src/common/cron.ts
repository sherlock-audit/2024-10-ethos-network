import { duration } from '@ethos/helpers';
import { CronJob } from 'cron';
import { type RedlockAbortSignal, ExecutionError, ResourceLockedError } from 'redlock2';
import { resourceLockedCounter } from '../contract-events/event-metrics.js';
import { redlock } from '../data/redis.js';
import { rootLogger } from './logger.js';

const logger = rootLogger.child({ module: 'cron' });

export class CronJobManager {
  private readonly job: CronJob;
  private readonly lockKey: string[];
  private readonly lockDuration: number;
  private readonly jobName: string;
  private readonly logger: typeof rootLogger;

  constructor(
    cronExpression: string,
    lockKey: string[],
    jobName: string,
    handler: (signal: RedlockAbortSignal) => Promise<void>,
    lockDuration: number = duration(30, 'seconds').toMilliseconds(),
  ) {
    this.lockKey = lockKey;
    this.lockDuration = lockDuration;
    this.jobName = jobName;
    this.logger = rootLogger.child({ module: jobName });

    this.job = new CronJob(cronExpression, async () => {
      await redlock.using(this.lockKey, this.lockDuration, handler).catch((err) => {
        CronJobManager.handleRedlockError(this.lockKey, {}, err);
      });
    });
  }

  async start(): Promise<void> {
    this.job.start();
    this.logger.info(`${this.jobName}.started`);
  }

  async stop(): Promise<void> {
    this.job.stop();
    this.logger.info(`${this.jobName}.stopped`);
  }

  public static handleRedlockError(key: string[], data: any, err: unknown): void {
    // Should only need to check ResourceLockedError, but redlock v5 has a bug https://github.com/mike-marcacci/node-redlock/issues/168
    if (err instanceof ResourceLockedError || err instanceof ExecutionError) {
      resourceLockedCounter.inc();
      logger.debug({ data: { key } }, 'resource_locked');

      return;
    }
    logger.error({ err, data }, 'cron_job_error');
  }

  public async executeJob(
    signal: RedlockAbortSignal,
    jobFunction: () => Promise<void>,
  ): Promise<void> {
    if (signal.aborted) {
      if (signal.error) throw signal.error;
      logger.warn(`${this.jobName}.aborted`);

      return;
    }
    try {
      await jobFunction();
    } catch (err) {
      this.logger.error({ err }, `${this.jobName}_error`);
    }
  }
}
