import { metrics } from '../common/metrics.js';

const prefix = 'event_processing';

export const resourceLockedCounter = metrics.makeCounter({
  name: `${prefix}_resource_locked`,
  help: 'Event processing resource locked',
});

export const eventsFoundCounter = metrics.makeSummary({
  name: `${prefix}_blockchain_events_found`,
  help: 'Events found during event processing',
  labelNames: ['contract'],
});

export const eventsProcessedSummary = metrics.makeSummary({
  name: `${prefix}_blockchain_events_processed`,
  help: 'Events processed during event processing',
  labelNames: ['contract'],
});

export const eventsIgnoredCounter = metrics.makeCounter({
  name: `${prefix}_blockchain_events_ignored`,
  help: 'Events ignored during event processing',
  labelNames: ['contract'],
});

export const invalidEventsCounter = metrics.makeCounter({
  name: `${prefix}_blockchain_events_invalid`,
  help: 'Invalid events during event processing',
  labelNames: ['contract'],
});

export const eventsRateLimitedCounter = metrics.makeCounter({
  name: `${prefix}_blockchain_events_rate_limited`,
  help: 'Events rate limited during event processing',
  labelNames: ['contract'],
});

export const eventsFailedCounter = metrics.makeCounter({
  name: `${prefix}_blockchain_events_failed`,
  help: 'Events that failed to process',
  labelNames: ['contract'],
});

export const eventsNotFoundCounter = metrics.makeCounter({
  name: `${prefix}_no_new_events`,
  help: 'Event processing jobs where no events were found',
  labelNames: ['contract'],
});

export const invalidatedScoresCounter = metrics.makeCounter({
  name: `${prefix}_invalidated_scores`,
  help: 'Scores invalidated during event processing',
  labelNames: ['contract'],
});

export const contractEventsListenedCounter = metrics.makeCounter({
  name: `${prefix}_contract_events_listened`,
  help: 'Number of times contract events were listened to',
  labelNames: ['contract'],
});

export const eventProcessingDuration = metrics.makeSummary({
  name: `${prefix}_duration`,
  help: 'Duration of event processing',
  labelNames: ['contract'],
});
