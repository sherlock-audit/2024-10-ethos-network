import { getConfig } from '@ethos/config';
import { ETHOS_ENVIRONMENTS } from '@ethos/env';
import { z } from 'zod';

export const config = getConfig({
  EMPOROS_DB_URL: z.string().url(),
  TIMESCALE_DB_URL: z.string().url(),
  ECHO_BASE_URL: z.string().url().optional(),
  ETHOS_ENV: z.enum(ETHOS_ENVIRONMENTS).default('local'),
  EMPOROS_PRIVY_APP_ID: z.string(),
  EMPOROS_PRIVY_APP_SECRET: z.string(),
  EMPOROS_PRIVY_APP_PUBLIC_KEY: z.string(),
  SESSION_SECRET: z.string(),
});

export const dbConfig = getConfig({
  DB_SERVER_CA: requiredWhenNotLocal(z.string().optional()),
  DB_SSL_CERT: requiredWhenNotLocal(z.string().optional()),
  DB_SSL_KEY: requiredWhenNotLocal(z.string().optional()),
});

function requiredWhenNotLocal<T extends z.ZodType>(schema: T): z.ZodType<T> {
  return schema.superRefine((value, ctx) => {
    if (config.ETHOS_ENV !== 'local' && value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${ctx.path.join('.')} is required when ETHOS_ENV is not 'local'`,
      });
    }
  });
}
