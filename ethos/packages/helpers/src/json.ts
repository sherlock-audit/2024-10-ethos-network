import { z } from 'zod';

const BIGINT_REGEX = /^\d+n$/;
const DATE_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)(Z|([+-])(\d{2}):(\d{2}))$/;

export function reviver(_key: string, value: any): any {
  if (typeof value === 'string') {
    if (BIGINT_REGEX.test(value)) {
      return BigInt(value.slice(0, -1));
    }

    if (DATE_REGEX.test(value)) {
      return new Date(value);
    }
  }

  return value;
}

export function replacer(_key: string, value: any): any {
  if (typeof value === 'bigint') {
    return value.toString() + 'n';
  }

  return value;
}

type ParseSafeOptions<T extends boolean> = {
  exposeError?: T;
  reviver?: (key: string, value: any) => any;
  zodSchema?: z.ZodRawShape;
};

type Result<T> = T | null;
type ResultWithError<T> = { result: Result<T>; error: unknown | null };

export function parseSafe<T>(json: string | null, options?: ParseSafeOptions<false>): Result<T>;
export function parseSafe<T>(
  json: string | null,
  options?: ParseSafeOptions<true>,
): ResultWithError<T>;
export function parseSafe<T>(
  json: string | null,
  options: ParseSafeOptions<boolean> = {},
): unknown {
  const exposeError = options.exposeError ?? false;

  if (!json) {
    return formatResult<T>(null, null, exposeError);
  }

  try {
    const parsed = JSON.parse(json, options.reviver) as T;

    if (options.zodSchema) {
      const result = z.object(options.zodSchema).parse(parsed);

      return formatResult<T>(result as T, null, exposeError);
    }

    return formatResult<T>(JSON.parse(json, options.reviver) as T, null, exposeError);
  } catch (error) {
    return formatResult<T>(null, error, exposeError);
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function formatResult<T>(result: T | null, error: unknown | null, exposeError: boolean) {
  if (exposeError) {
    return {
      result,
      error,
    };
  }

  return result;
}
