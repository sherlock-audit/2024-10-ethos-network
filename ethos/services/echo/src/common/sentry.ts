import type * as Sentry from '@sentry/node';
import { config } from './config';

const SENTRY_DSN =
  'https://29476cd9322b80c975346f0a8b190ccf@o4507806370955264.ingest.us.sentry.io/4507941585158144';

export const commonOptions: Parameters<typeof Sentry.init>[0] = {
  dsn: SENTRY_DSN,
  environment: config.ETHOS_ENV,
  enabled: process.env.NODE_ENV === 'production',
  debug: false,
};
