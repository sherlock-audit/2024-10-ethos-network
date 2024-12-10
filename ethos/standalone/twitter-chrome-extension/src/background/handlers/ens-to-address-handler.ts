import { type EnsDetailsByNameResponse } from '@ethos/echo-client';
import { type ENSPayload } from '../../types/message';
import { type ConvertEnsToEthAddressResponse } from '../../types/payload';
import { ethios } from '../config/axios';
import { ETHOS_API_URL } from '../config/constants';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class ENSAddressHandler {
  public static async fetchAddressFromENS(
    payload: ENSPayload,
    sendResponse: (response: ConvertEnsToEthAddressResponse) => void,
  ) {
    const ensName = payload.ens;

    if (!ensName) {
      sendResponse({ success: false, error: 'ENS is empty or invalid' });

      return;
    }

    try {
      const response = await ethios.get<EnsDetailsByNameResponse>(
        `${ETHOS_API_URL}/api/v1/ens-details/by-name/${ensName}`,
      );

      const ethAddress = response.data?.data?.address;

      if (!ethAddress) {
        sendResponse({ success: false, error: 'ETH address not found for the given ENS' });

        return;
      }

      sendResponse({ success: true, ethAddress });
    } catch (error) {
      console.error('Error converting ENS to ETH address:', error);
      sendResponse({
        success: false,
        error: 'An unknown error occurred while converting ENS to ETH address',
      });
    }
  }
}
