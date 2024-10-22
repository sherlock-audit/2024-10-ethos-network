import { BrowserAnalyticsClient } from '@ethos/analytics';
import { getAmplitudeApiKey, getEnvironment } from 'config';

const ethosEnvironment = getEnvironment();

let clientInitialized = false;

export function initializeAnalytics() {
  if (typeof window === 'undefined' || clientInitialized) {
    return;
  }

  clientInitialized = true;

  const analyticsClient = new BrowserAnalyticsClient(getAmplitudeApiKey(), {
    amplitudeOptions: {
      autocapture: {
        attribution: true,
        pageViews: true,
        sessions: true,
        formInteractions: false,
        fileDownloads: false,
      },
    },
    enableSessionReplay: ethosEnvironment === 'testnet' || ethosEnvironment === 'prod',
    sessionReplayOptions: {
      // This will capture all sessions. The more users we have, the more
      // sessions we have. We should consider reducing the sample rate once we
      // have more users to prevent exhausting our monthly quota.
      // More about this: https://amplitude.com/docs/session-replay/session-replay-plugin#sampling-rate
      sampleRate: 1,
    },
  });

  analyticsClient.setGlobalEventProperties({
    '[Amplitude] Page Domain': typeof window !== 'undefined' ? window.location.hostname : '',
    '[Amplitude] Environment': ethosEnvironment,
  });

  return analyticsClient;
}
