import { getConfig } from '@ethos/config';
import { ETHOS_ENVIRONMENTS } from '@ethos/env';
import { type ServiceAccount } from 'firebase-admin';
import { jwtDecode } from 'jwt-decode';
import { z } from 'zod';

export const config = getConfig({
  ALCHEMY_API_KEY: z.string(),
  ALCHEMY_MAINNET_API_URL: z.string().url(),
  ALCHEMY_TESTNET_API_URL: z.string().url(),
  DATABASE_URL: z.string(),
  AMQP_URL: z.string().url(),
  CHAOS_PERCENTAGE_RATE: z.number().nonnegative().default(0),
  DEPLOYMENT_ID: z.string().default('local-dev'),
  ETHOS_ENV: z.enum(ETHOS_ENVIRONMENTS).default('local'),
  FIREBASE_ADMIN_CREDENTIALS: z
    .string()
    .base64()
    .transform((v) => {
      try {
        const decoded = JSON.parse(Buffer.from(v, 'base64').toString('utf8'));

        const serviceAccount: ServiceAccount = {
          projectId: decoded.project_id,
          clientEmail: decoded.client_email,
          privateKey: decoded.private_key,
        };

        return serviceAccount;
      } catch {
        throw new Error('FIREBASE_ADMIN_CREDENTIALS is not a valid base64 string');
      }
    })
    .pipe(
      z.object({
        projectId: z.string(),
        clientEmail: z.string().email(),
        privateKey: z.string(),
      }),
    ),
  FLY_MACHINE_ID: z.string().optional().default('local'),
  MORALIS_API_KEY: z.string().refine(isJWT(), 'Invalid JWT'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT_ECHO: z.coerce.number().positive().default(8080),
  PORT_ECHO_METRICS: z.coerce.number().positive().default(9091),
  PRIVY_APP_ID: z.string(),
  PRIVY_APP_SECRET: z.string(),
  PRIVY_APP_PUBLIC_KEY: z.string(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  SIGNER_ACCOUNT_PRIVATE_KEY: z.string().length(64),
  STATSIG_SECRET_KEY: z.string(),
  TWITTER_BEARER_TOKEN: z.string(),
  SENTRY_TRACE_SAMPLE_RATE: z.coerce.number().default(1.0),
  SENTRY_PROFILING_SAMPLE_RATE: z.coerce.number().default(1.0),
  WORKER_TYPE: z.enum(['events', 'http', 'primary']).default('primary'),
});

export const dbConfig = getConfig({
  DB_SERVER_CA: requiredWhenNotLocal(z.string().optional()),
  DB_SSL_CERT: requiredWhenNotLocal(z.string().optional()),
  DB_SSL_KEY: requiredWhenNotLocal(z.string().optional()),
});

function isJWT() {
  return (value: string) => {
    try {
      const decoded = jwtDecode(value);

      return typeof decoded === 'object' && decoded !== null;
    } catch {
      return false;
    }
  };
}

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
