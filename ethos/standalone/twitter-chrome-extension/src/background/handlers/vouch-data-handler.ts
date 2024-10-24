/* eslint-disable no-restricted-imports */
import { toUserKey } from '@ethos/domain/src/user';
import { isValidAddress } from '@ethos/helpers/src/address';

import {
  type ActorLookupResponse,
  type EthPriceResponse,
  type VouchStatsResponse,
} from '../../../../../services/echo/src/types/api.types';
import { type HandlePayload, type AddressPayload } from '../../types/message';
import { type VouchDetailsResponse } from '../../types/payload';
import { ethios } from '../config/axios';
import { ETHOS_API_URL } from '../config/constants';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class VouchDataHandler {
  public static async handleVouchDetailsFromEthAddress(
    payload: AddressPayload,
    sendResponse: (response: VouchDetailsResponse) => void,
  ) {
    try {
      if (!isValidAddress(payload.address)) {
        throw new Error('No address provided');
      }

      const userkey = toUserKey({ address: payload.address });
      const profileId = await this.fetchProfileData(userkey);

      if (!profileId) {
        throw new Error('Failed to fetch profile data');
      }

      const data = await this.fetchVouchData(profileId);
      const { staked, count } = data?.[profileId] ?? {};
      const vouchedInUsd = await this.convertEThToUSD(staked?.received ?? 0);

      sendResponse({
        profileId,
        vouchCount: count?.received ?? 0,
        vouchedInUSD: vouchedInUsd,
        success: true,
      });
    } catch (error) {
      sendResponse({
        success: false,
        vouchedInUSD: 0,
        vouchCount: 0,
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        error: 'Failed to fetch vouch data with error: ' + error,
      });
    }
  }

  public static async handleVouchDetailsFromXHandle(
    payload: HandlePayload,
    sendResponse: (response: VouchDetailsResponse) => void,
  ) {
    try {
      if (payload.handle) {
        const userkey = toUserKey({ service: 'x.com', username: payload.handle });
        const profileId = await this.fetchProfileData(userkey);

        if (!profileId) {
          throw new Error('Failed to fetch profile data');
        }
        const dataById = await this.fetchVouchData(profileId);
        const { staked, count } = dataById?.[profileId] ?? {};
        const vouchedInUsd = await this.convertEThToUSD(staked?.received ?? 0);

        sendResponse({
          profileId,
          vouchCount: count?.received ?? 0,
          vouchedInUSD: vouchedInUsd,
          success: true,
        });
      }
    } catch (error) {
      sendResponse({
        success: false,
        vouchCount: 0,
        vouchedInUSD: 0,
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        error: 'Failed to fetch vouch data with error: ' + error,
      });
    }
  }

  private static async fetchProfileData(userkey: string) {
    try {
      const response = await ethios.get<ActorLookupResponse>(
        `${ETHOS_API_URL}/api/v1/activities/actor/${userkey}`,
      );

      if (response.data.ok && response.data.data.profileId) {
        return response.data.data.profileId;
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`failed to fetch profile data: ${error}`);
    }
  }

  private static async fetchVouchData(profileId: number) {
    try {
      const response = await ethios.post<VouchStatsResponse>(
        `${ETHOS_API_URL}/api/v1/vouches/stats`,
        {
          profileIds: [profileId],
        },
      );

      const data = response.data;

      if (!data.ok) {
        throw new Error('Vouch data fetch failed or invalid format');
      }

      return data.data;
    } catch (error) {
      console.error('fetchVouchData error', error);
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Failed to fetch vouch data: ${error}`);
    }
  }

  private static async convertEThToUSD(ethAmount: number) {
    const response = await ethios.get<EthPriceResponse>(
      `${ETHOS_API_URL}/api/v1/exchange-rates/eth-price`,
    );

    if (!response.data.ok) {
      console.error('Failed to fetch ETH price', response.data);
      throw new Error('Failed to fetch ETH price');
    }

    const usd = response.data.data.price;

    const vouchedInUsd = ethAmount * usd;

    return vouchedInUsd;
  }
}
