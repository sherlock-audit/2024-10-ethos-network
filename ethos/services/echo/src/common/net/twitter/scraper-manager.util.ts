import { setTimeout } from 'node:timers/promises';
import { duration } from '@ethos/helpers';
import { Scraper } from '@the-convocation/twitter-scraper';
import { rootLogger } from '../../logger';
import { metrics } from '../../metrics';

const logger = rootLogger.child({ module: 'twitter-scraper-manager' });

const GUEST_ACTIVATION_URL = 'https://api.twitter.com/1.1/guest/activate.json';
const REQUEST_TIMEOUT = duration(5, 'seconds').toMilliseconds();
const SCRAPER_REINIT_THROTTLING_INTERVAL = duration(15, 'seconds').toMilliseconds();

const scraperStatusCount = metrics.makeCounter({
  name: 'twitter_scraper_manager_status',
  help: 'Counter to measure scraper status',
  labelNames: ['method_name', 'status'],
});

/**
 * Custom error class to represent being rate-limited by the Twitter API.
 *
 * @note It does not extend the Error class, so it could pass the check inside
 * the library and throw this class exactly in a way how we passed it.
 * Code: https://github.com/the-convocation/twitter-scraper/blob/910b03847024fb820ab0206198adb93b6670b8f1/src/api.ts#L68-L70
 *
 * @note We should be cautious when a new version of the library is released.
 */
class ScraperRateLimitError {
  name: string;
  message: string;

  constructor() {
    this.name = 'ScraperRateLimitError';
    this.message = 'Twitter rate limit activated';
  }
}

/**
 * Custom error class to represent that we ended up with bad guest token.
 *
 * @note It does not extend the Error class, so it could pass the check inside
 * the library and throw this class exactly in a way how we passed it.
 * Code: https://github.com/the-convocation/twitter-scraper/blob/910b03847024fb820ab0206198adb93b6670b8f1/src/api.ts#L68-L70
 *
 * @note We should be cautious when a new version of the library is released.
 */
class ScraperBadGuestTokenError {
  name: string;
  message: string;

  constructor() {
    this.name = 'ScraperBadGuestTokenError';
    this.message = 'Twitter rejected guest token';
  }
}

export class ScraperManager {
  private scraper: Scraper;
  private lastReInitTime: number; // Timestamp of the last re-initialization
  private isReInitializing: boolean; // Flag to track if re-initialization is in progress

  constructor() {
    this.scraper = this.createScraper();
    this.lastReInitTime = Date.now();
    this.isReInitializing = false;
  }

  /**
   * Fetches a Twitter profile.
   * @param username The Twitter username of the profile to fetch, without an @ at the beginning.
   */
  public async getProfile(username: string): ReturnType<Scraper['getProfile']> {
    try {
      return await this.scraper.getProfile(username);
    } catch (error) {
      if (error instanceof ScraperRateLimitError) {
        logger.debug('🛑 "getProfile" rate-limited: 429');

        scraperStatusCount.inc({ method_name: 'getProfile', status: 'rate_limited' });

        await this.reInitializeScraper('getProfile');

        return await this.scraper.getProfile(username);
      }

      if (error instanceof ScraperBadGuestTokenError) {
        logger.debug('🛑 "getProfile" bad guest token: 403');

        scraperStatusCount.inc({ method_name: 'getProfile', status: 'bad_guest_token' });

        await this.reInitializeScraper('getProfile');

        return await this.scraper.getProfile(username);
      }

      throw error;
    }
  }

  private createScraper(): Scraper {
    return new Scraper({
      transform: {
        request(input, init = {}) {
          // Abort the request if it takes too long
          init.signal = AbortSignal.timeout(REQUEST_TIMEOUT);

          return [input, init];
        },
        async response(response) {
          // Ignore rate-limiting on the guest activation endpoint as that one
          // is handled pretty good in the library
          if (response.status === 429 && response.url !== GUEST_ACTIVATION_URL) {
            // Throw a custom error when rate-limited so we can catch it later
            // in the method and potentially re-initialize the scraper
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw new ScraperRateLimitError();
          }

          if (response.status === 403) {
            const body = await response.json().catch(() => null);
            const isBadGuestTokenError = body?.find((e: Error) => e?.message === 'Bad guest token');

            // TODO: I don't know exactly what's the response body structure, so
            // logging the entire body and also my guess of what it should be.
            // I'll remove it after verifying the structure.
            logger.info(
              {
                data: {
                  body,
                  isBadGuestTokenError,
                },
              },
              'twitter_api_error.bad_guest_token',
            );

            if (isBadGuestTokenError) {
              // Throw a custom error when we ended up with bad guest token so
              // we can catch it later in the method and potentially
              // re-initialize the scraper
              // eslint-disable-next-line @typescript-eslint/no-throw-literal
              throw new ScraperBadGuestTokenError();
            }
          }

          return response;
        },
      },
    });
  }

  /**
   * Re-initializes the scraper. Throttles re-initialization if it's called too frequently.
   */
  private async reInitializeScraper(reInitCause: string): Promise<void> {
    // If already re-initializing, wait until it's done
    if (this.isReInitializing) {
      logger.debug('⏳ Re-initialization is already in progress, waiting...');
      scraperStatusCount.inc({ method_name: reInitCause, status: 'reinit_in_progress' });

      const waitTime = Math.min(
        Date.now() - this.lastReInitTime,
        SCRAPER_REINIT_THROTTLING_INTERVAL,
      );

      // Wait slightly more than needed to make sure another re-init in-flight is done
      await setTimeout(waitTime + 1000);

      return;
    }

    // Set the re-initializing flag to true
    this.isReInitializing = true;

    if (this.shouldThrottleReinit()) {
      const waitTime = SCRAPER_REINIT_THROTTLING_INTERVAL - (Date.now() - this.lastReInitTime);
      logger.debug(`⏳ Throttled. Waiting for ${waitTime}ms`);

      // Wait until the next available re-init time
      await setTimeout(waitTime);
    }

    logger.debug('♻️ Creating a new instance of scraper');

    this.scraper = this.createScraper();
    this.lastReInitTime = Date.now();

    scraperStatusCount.inc({ method_name: reInitCause, status: 'reinitialized' });

    // Set the flag back to false when re-initialization is done
    this.isReInitializing = false;
  }

  /**
   * Determines whether re-initialization of the scraper should be throttled.
   */
  private shouldThrottleReinit(): boolean {
    const now = Date.now();

    return now - this.lastReInitTime < SCRAPER_REINIT_THROTTLING_INTERVAL;
  }
}
