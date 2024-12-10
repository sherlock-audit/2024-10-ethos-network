import * as amplitude from '@amplitude/analytics-browser';
import { type BrowserOptions } from '@amplitude/analytics-types';
import { sessionReplayPlugin } from '@amplitude/plugin-session-replay-browser';
import { type Attributes } from './analytics.type.js';

type SessionReplayOptions = Parameters<typeof sessionReplayPlugin>[0];

export class BrowserAnalyticsClient {
  private globalEventProperties: Attributes = {};

  constructor(
    apiKey: string,
    options?: {
      amplitudeOptions?: BrowserOptions;
      enableSessionReplay?: boolean;
      sessionReplayOptions?: SessionReplayOptions;
    },
  ) {
    if (options?.enableSessionReplay) {
      const sessionReplayTracking = sessionReplayPlugin(options.sessionReplayOptions);

      amplitude.add(sessionReplayTracking);
    }

    amplitude.init(apiKey, {
      useBatch: true,
      ...options?.amplitudeOptions,
    });
  }

  setGlobalEventProperties(properties: Attributes): void {
    this.globalEventProperties = properties;
  }

  setUserId(userId: string): void {
    amplitude.setUserId(userId);
  }

  setUserProperties(properties: Attributes): void {
    const identity = new amplitude.Identify();

    for (const [key, value] of Object.entries(properties)) {
      identity.set(key, value);
    }

    amplitude.identify(identity);
  }

  /**
   * Sends an event about screen being viewed. It can be used to track page views
   * or views of specific components like modal, banner, etc.
   */
  sendScreenEvent(screenName: string, attributes?: Attributes): void {
    const eventProperties = {
      ...this.globalEventProperties,
      ...attributes,
    };

    amplitude.track(`viewed ${screenName}`, eventProperties);
  }

  /**
   * Sends an event about the result of user interaction with the app. For
   * example, user signed in, file uploaded, form submitted, etc.
   * @param actionSubject E.g., 'user', 'file', 'form'
   * @param action E.g., 'signedIn', 'uploaded', 'submitted'
   */
  sendTrackEvent(
    actionSubject: string,
    action: string,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    const eventProperties = {
      ...this.globalEventProperties,
      ...attributes,
    };

    amplitude.track(`${actionSubject} ${action}`, eventProperties);
  }

  /**
   * Sends an event about user interaction with the UI. For example, button click,
   * link click, dropdown opened, etc.
   * @param actionSubject E.g., 'button', 'link', 'dropdown'
   * @param action E.g., 'click', 'hover', 'open'
   * @param actionSubjectId Identifier of the UI element that was interacted with
   */
  sendUIEvent(
    actionSubject: string,
    action: string,
    actionSubjectId: string,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    const eventProperties = {
      ...this.globalEventProperties,
      ...attributes,
      actionSubjectId,
    };

    amplitude.track(`${actionSubject} ${action}`, eventProperties);
  }
}
