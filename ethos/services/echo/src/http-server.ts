import { type Server } from 'node:http';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { initApp } from './app';
import { config } from './common/config';
import { rootLogger as logger } from './common/logger';
import { commonOptions } from './common/sentry';

Sentry.init({
  ...commonOptions,
  integrations: [nodeProfilingIntegration()],

  // Tracing
  tracesSampleRate: config.SENTRY_TRACE_SAMPLE_RATE,
  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: config.SENTRY_PROFILING_SAMPLE_RATE,
});

const { PORT_ECHO } = config;

let server: Server | undefined;

export async function startServer(): Promise<void> {
  await new Promise((resolve) => {
    server = initApp().listen(PORT_ECHO, () => {
      logger.info(`Server is running at http://localhost:${PORT_ECHO}`);
      resolve(server);
    });
  });
}

export function stopServer(): void {
  server?.close();
}
