import { ServerAnalyticsClient } from '@ethos/analytics';
import { getAmplitudeApiKey } from 'config';

/**
 * This should be used only in a server-side code
 */
const serverAnalyticsClient = new ServerAnalyticsClient(getAmplitudeApiKey());

serverAnalyticsClient.setGlobalEventProperties({
  service: 'web',
});

export const serverAnalytics = {
  openGraphImageRendered(
    cardType: 'profile' | 'review' | 'vouch' | 'invite',
    cardId: number | string,
    userAgent: string,
  ) {
    serverAnalyticsClient.sendTrackEvent('open_graph_image_rendered', {
      cardType,
      cardId,
      userAgent,
    });
  },
};
