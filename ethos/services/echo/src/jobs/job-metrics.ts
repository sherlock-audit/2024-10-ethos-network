import { metrics } from '../common/metrics.js';

const prefix = 'internal_ethos_job';

export const jobCompletedCounter = metrics.makeCounter({
  name: `${prefix}_completed`,
  help: 'Job processing completed successfully',
  labelNames: ['job'],
});

export const jobFailedCounter = metrics.makeCounter({
  name: `${prefix}_failed`,
  help: 'Job processing failed',
  labelNames: ['job'],
});

export const jobDuration = metrics.makeSummary({
  name: `${prefix}_duration`,
  help: 'Duration of job processing',
  labelNames: ['job'],
});
