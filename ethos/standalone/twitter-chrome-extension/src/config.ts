import { type BrowserOptions } from '@sentry/browser';
import pkg from '../package.json' with { type: 'json' };

const isSentryEnabled = import.meta.env.VITE_ENABLE_SENTRY === 'true';

export const sentryCommonOptions: BrowserOptions = {
  dsn: 'https://799af5bf94a85e569b1aab96e103b528@o4507806370955264.ingest.us.sentry.io/4507946927325184',
  release: `twitter-chrome-extension@${pkg.version}`,
  environment: isSentryEnabled ? 'production' : 'development',
  enabled: isSentryEnabled,
  sampleRate: 1.0,
};
