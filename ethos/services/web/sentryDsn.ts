import { type init } from '@sentry/nextjs';

const sentryDsn =
  'https://f11b94ca063b130998a17b71c02fa3ae@o4507806370955264.ingest.us.sentry.io/4507806374363136';

export const commonOptions: Parameters<typeof init>[0] = {
  dsn: sentryDsn,
  environment: process.env.NEXT_PUBLIC_ETHOS_ENV,
  enabled: process.env.NODE_ENV === 'production',

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
};
