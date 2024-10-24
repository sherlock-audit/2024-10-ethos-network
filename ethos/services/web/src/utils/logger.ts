import { serializeError } from 'serialize-error';

// TODO: eventually, replace with @ethos/logger when we need a better structured logs
function getLogger(name: string, ctxOverride?: Record<string, unknown>) {
  const context = { name, ...ctxOverride };

  function log(...args: Array<string | Record<string, unknown>>): void {
    const time = new Date().toISOString();
    const ctxStr = Object.entries(context)
      .map(([k, v]) => `${k}:${v}`)
      .join(',');

    const serializedArgs = args.map((arg) => {
      if (arg instanceof Error) {
        return serializeError(arg);
      }

      if (typeof arg === 'object') {
        for (const [k, v] of Object.entries(arg)) {
          if (v instanceof Error) {
            arg[k] = serializeError(v);
          }
        }
      }

      return arg;
    });

    const logMessage =
      process.env.NODE_ENV === 'production'
        ? [
            JSON.stringify({
              data: serializedArgs,
              context,
              time,
            }),
          ]
        : [`\n${time} [${ctxStr}]:`, ...serializedArgs];

    // eslint-disable-next-line no-console
    console.log(...logMessage);
  }

  return {
    trace: log,
    debug: log,
    info: log,
    warn: log,
    error: log,
    fatal: log,
    child: (ctx: Record<string, unknown>) => {
      return getLogger(name, { ...context, ...ctx });
    },
  };
}

export const baseLogger = getLogger('web');
