import { toUserKey } from '@ethos/domain';
import { type ScoreResponse } from '@ethos/echo-client';
import { isValidAddress } from '@ethos/helpers';
import { type HandlePayload, type AddressPayload } from '../../types/message';
import { type CredibilityScoreResponse } from '../../types/payload';
import { ethios } from '../config/axios';
import { ETHOS_API_URL } from '../config/constants';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class CredibilityScoreHandler {
  public static async fetchCredibilityScoreFromAddress(
    payload: AddressPayload,
    sendResponse: (response: CredibilityScoreResponse) => void,
  ) {
    try {
      if (!isValidAddress(payload.address)) {
        sendResponse({
          success: false,
          error: 'Invalid address',
        });

        return;
      }
      const userkey = toUserKey({ address: payload.address });
      const response = await ethios.get<ScoreResponse>(`${ETHOS_API_URL}/api/v1/score/${userkey}`);

      const score = response.data.data.score;
      sendResponse({ success: true, score });
    } catch (error) {
      sendResponse({
        success: false,
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        error: `failed to fetch credibility score with error: ${error}`,
      });
    }
  }

  public static async fetchCredibilityScoreFromXHandle(
    payload: HandlePayload,
    sendResponse: (response: CredibilityScoreResponse) => void,
  ) {
    try {
      if (!payload.handle) {
        sendResponse({
          success: false,
          error: 'No handle provided',
        });

        return;
      }

      const userkey = toUserKey({ service: 'x.com', username: payload.handle });
      const response = await ethios.get<ScoreResponse>(`${ETHOS_API_URL}/api/v1/score/${userkey}`);

      const score = response.data.data.score;
      sendResponse({ success: true, score });
    } catch (error) {
      sendResponse({
        success: false,
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        error: `failed to fetch credibility score with error: ${error}`,
      });
    }
  }
}
