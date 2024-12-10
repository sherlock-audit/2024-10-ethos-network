import { pino, type Logger as PinoLogger, type LoggerOptions } from 'pino';

type DefaultLogObj = {
  err?: unknown;
  data?: any;
  req?: Record<string, any>;
  res?: Record<string, any>;
};

type LogFn = {
  (msg: string): void;
  /**
   * Usage: `logger.info({ data: { foo: 'bar' } }, 'Request completed')`
   */
  <T = DefaultLogObj>(obj: T, msg?: string): void;
};

export type Logger = Omit<
  PinoLogger,
  'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent' | 'child'
> & {
  fatal: LogFn;
  error: LogFn;
  warn: LogFn;
  info: LogFn;
  debug: LogFn;
  trace: LogFn;
  silent: LogFn;
  child: (params: Record<string, unknown>) => Logger;
};

export function getLogger(
  service: string,
  options?: Omit<LoggerOptions, 'transport'> & {
    transportTargets?: pino.TransportMultiOptions['targets'];
  },
): Logger {
  const isProduction = process.env.NODE_ENV === 'production';

  const logFile = process.env.LOG_FOLDER
    ? `${process.env.LOG_FOLDER}/ethos.log`
    : './logs/ethos.log'; // Fallback to a default log path

  const usePinoPretty = !isProduction && !process.env.LOG_FOLDER;
  const level = process.env.LOG_LEVEL ?? 'info';

  const targets: pino.TransportMultiOptions['targets'] = [
    ...(usePinoPretty
      ? [{ target: 'pino-pretty', level }]
      : [
          {
            // Ensures stdout is still used
            target: 'pino/file',
            options: { destination: 1 },
          },
        ]),
    ...(options?.transportTargets ?? []),
  ];

  const config: LoggerOptions = {
    base: null,
    redact: [],
    ...options,
    transport: {
      targets,
    },
    level,
  };

  const logger = process.env.LOG_FOLDER ? pino(config, pino.destination(logFile)) : pino(config);

  return logger.child({ service });
}
