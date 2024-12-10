import { type StatsigOptions, type StatsigUser, type DynamicConfig } from 'statsig-node';

// Statsig's types are not being exported correctly:
// https://github.com/statsig-io/node-js-server-sdk/issues/54
declare module 'statsig-node' {
  export type InitializationDetails = {
    duration: number;
    success: boolean;
    error?: Error;
    source?: InitializationSource;
  };
  export type InitializationSource = 'Network' | 'Bootstrap' | 'DataAdapter';

  export function initialize(
    secretKey: string,
    options?: StatsigOptions,
  ): Promise<InitializationDetails>;

  export function checkGateSync(user: StatsigUser, gateName: string): boolean;

  export function getConfigSync(user: StatsigUser, configName: string): DynamicConfig;
}
