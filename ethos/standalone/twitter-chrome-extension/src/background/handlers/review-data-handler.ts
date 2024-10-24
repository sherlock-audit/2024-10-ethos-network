/* eslint-disable no-restricted-imports */
import { X_SERVICE } from '@ethos/domain/src/attestations';
import { toUserKey } from '@ethos/domain/src/user';
import { isValidAddress } from '@ethos/helpers/src/address';
import {
  type ReviewStatsRequest,
  type ReviewStatsResponse,
} from '../../../../../services/echo/src/types/api.types';
import { type HandlePayload, type AddressPayload } from '../../types/message';
import { type ReviewDetailsResponse } from '../../types/payload';
import { ethios } from '../config/axios';
import { ETHOS_API_URL } from '../config/constants';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class ReviewDataHandler {
  private static async fetchReviewDetails(
    endpointData: ReviewStatsRequest,
    sendResponse: (response: ReviewDetailsResponse) => void,
  ) {
    try {
      const response = await ethios.post<ReviewStatsResponse>(
        `${ETHOS_API_URL}/api/v1/reviews/stats`,
        endpointData,
      );
      sendResponse({
        success: true,
        reviewCount: response.data.data.total?.received ?? 0,
        positivePercentage: response.data.data.total?.positiveReviewPercentage ?? 0,
      });
    } catch (error) {
      let errorMessage = 'An unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
      }
      sendResponse({
        success: false,
        reviewCount: 0,
        positivePercentage: 0,
        error: errorMessage,
      });
    }
  }

  public static async handleReviewDetailsFromEthAddress(
    payload: AddressPayload,
    sendResponse: (response: ReviewDetailsResponse) => void,
  ) {
    if (!isValidAddress(payload.address)) {
      sendResponse({
        success: false,
        reviewCount: 0,
        positivePercentage: 0,
        error: 'Invalid address',
      });

      return;
    }
    const endpointData: ReviewStatsRequest = {
      target: toUserKey({
        address: payload.address,
      }),
    };
    await this.fetchReviewDetails(endpointData, sendResponse);
  }

  public static async handleReviewDetailsFromXHandle(
    payload: HandlePayload,
    sendResponse: (response: ReviewDetailsResponse) => void,
  ) {
    if (!payload.handle) {
      sendResponse({
        success: false,
        reviewCount: 0,
        positivePercentage: 0,
        error: 'Handle is required',
      });

      return;
    }
    const endpointData: ReviewStatsRequest = {
      target: toUserKey({
        service: X_SERVICE,
        username: payload.handle,
      }),
    };
    await this.fetchReviewDetails(endpointData, sendResponse);
  }
}
