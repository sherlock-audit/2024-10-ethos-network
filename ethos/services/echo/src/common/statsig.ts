import Statsig from 'statsig-node';
import { z } from 'zod';
import { config } from './config.js';
import { rootLogger } from './logger.js';

type StatsigEnv = 'development' | 'staging' | 'production';

const GLOBAL_USER = { userID: 'global' };

export const FEATURE_GATES = {
  CONTRACT_EVENTS_BATCH_JOB: 'contract-events-batch-job',
  INTERNAL_ETHOS_EVENTS: 'internal-ethos-events',
  USE_REDIS_INSTEAD_OF_LRU: 'use_redis_instead_of_lru_cache',
  UPDATE_DB_EVENT_TYPES: 'update_db_event_types',
  USE_BLOCKCHAIN_EVENT_POLLING: 'use_blockchain_event_polling',
  PWA_NOTIFICATIONS: 'enable_pwa_notifications',
  ENSURE_SINGLE_CONTRACT_EVENT_PROCESSOR: 'ensure_single_contract_event_processor',
} as const;

type FeatureFlagKey = keyof typeof FEATURE_GATES;
type FeatureFlagValue = (typeof FEATURE_GATES)[FeatureFlagKey];

export const DYNAMIC_CONFIGS = {
  ECHO_ENDPOINT_GATEWAY: {
    name: 'gateway_echo_endpoints',
    schema: z.union([
      z.record(z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']), z.string()),
      z.object({}),
    ]),
  },
  ACCOUNTS_FOR_CONTRIBUTOR_MODE: {
    name: 'accounts_for_contributor_mode',
    schema: z.object({ targets: z.string().array() }),
  },
} as const satisfies Record<string, DynamicConfigValue<any>>;

type DynamicConfigValue<T extends Zod.ZodTypeAny> = { name: string; schema: T };

const logger = rootLogger.child({ module: 'statsig' });

function getStatsigEnvironment(): StatsigEnv {
  switch (config.ETHOS_ENV) {
    case 'local':
    case 'dev':
      return 'development';
    case 'testnet':
      return 'staging';
    case 'prod':
      return 'production';
    default:
      throw new Error('Unknown environment');
  }
}

export async function initStatsig(): Promise<void> {
  await Statsig.initialize(config.STATSIG_SECRET_KEY, {
    environment: {
      tier: getStatsigEnvironment(),
    },
  });
}

/**
 * Checks the status of a global feature gate.
 *
 * @param featureFlag - The feature gate to check.
 * @returns {boolean} True if the feature gate is enabled, false otherwise.
 * @remarks Feature gates are disabled by default.
 */
export function getGlobalFeatureGate(featureFlag: FeatureFlagValue): boolean {
  return Statsig.checkGateSync(GLOBAL_USER, featureFlag);
}

/**
 * Retrieves and parses the value of a global dynamic config.
 *
 * @param dynamicConfig - The name of the dynamic config to retrieve.
 * @returns The parsed value of the dynamic config.
 * @throws {Error} If the config name is not found or if the parsing fails.
 */
export function getGlobalDynamicConfig<T extends Zod.ZodTypeAny>(
  dynamicConfig: DynamicConfigValue<T>,
): z.infer<DynamicConfigValue<T>['schema']> {
  const config = Statsig.getConfigSync(GLOBAL_USER, dynamicConfig.name);
  const parsedConfig = dynamicConfig.schema.safeParse(config.value);

  if (!parsedConfig.success) {
    logger.error(
      {
        data: {
          errors: parsedConfig.error.issues,
          dynamicConfigName: dynamicConfig.name,
          config,
        },
      },
      'Failed to parse Statsig dynamic config',
    );
  }

  return parsedConfig.data ?? {};
}
