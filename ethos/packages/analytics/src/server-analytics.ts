import { init, track } from '@amplitude/analytics-node';
import { type NodeOptions } from '@amplitude/analytics-types';
import { type Attributes } from './analytics.type';

export class ServerAnalyticsClient {
  private globalEventProperties: Attributes = {};

  constructor(apiKey: string, options?: NodeOptions) {
    init(apiKey, {
      useBatch: true,
      serverUrl: 'https://api2.amplitude.com/batch',
      ...options,
    });
  }

  setGlobalEventProperties(properties: Attributes): void {
    this.globalEventProperties = properties;
  }

  sendTrackEvent(event: string, properties?: Record<string, any>): void {
    track(
      event,
      {
        ...this.globalEventProperties,
        ...properties,
      },
      { user_id: 'server' },
    );
  }
}
