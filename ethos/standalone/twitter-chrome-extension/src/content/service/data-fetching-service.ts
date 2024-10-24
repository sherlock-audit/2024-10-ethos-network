/* eslint-disable no-restricted-imports */
import { DEFAULT_STARTING_SCORE } from '@ethos/domain/src/score';
import { type Message } from '../../types/message.ts';
import {
  type ConvertEnsToEthAddressResponse,
  type CredibilityScoreResponse,
  type ReviewDetailsResponse,
  type VouchDetailsResponse,
} from '../../types/payload';
import { sendMessage } from '../helpers/message-helper.ts';

export class DataFetchingService {
  async fetchCredibilityScoreFromEthAddress(address: string): Promise<CredibilityScoreResponse> {
    const message: Message = {
      type: 'FETCH_CREDIBILITY_SCORE_FROM_ADDRESS',
      address,
    };

    try {
      const response = await sendMessage<CredibilityScoreResponse>(message);

      return response;
    } catch (error) {
      const err = error as Error;
      console.error('Error in fetchCredibilityScore:', err.message);

      return { success: false, score: DEFAULT_STARTING_SCORE, error: err.message };
    }
  }

  async fetchCredibilityScoreFromXHandler(handle: string): Promise<CredibilityScoreResponse> {
    const message: Message = {
      type: 'FETCH_CREDIBILITY_SCORE_FROM_HANDLE',
      handle,
    };

    try {
      const response = await sendMessage<CredibilityScoreResponse>(message);

      return response;
    } catch (error) {
      const err = error as Error;
      console.error('Error in fetchCredibilityScore:', err.message);

      return { success: false, score: DEFAULT_STARTING_SCORE, error: err.message };
    }
  }

  async convertEnsToEthAddress(ensName: string): Promise<string | null> {
    const message: Message = {
      type: 'CONVERT_ENS_TO_ETH_ADDRESS',
      ens: ensName,
    };

    try {
      const response = await sendMessage<ConvertEnsToEthAddressResponse>(message);

      if (response.success && response.ethAddress) {
        return response.ethAddress;
      } else {
        throw new Error('Error fetching Ethereum address');
      }
    } catch (error) {
      const err = error as Error;
      console.error('Error in convertEnsToEthAddress:', err.message);

      return null;
    }
  }

  async fetchReviewDetailsByEthAddress(address: string): Promise<ReviewDetailsResponse> {
    const message: Message = {
      type: 'FETCH_REVIEW_DETAILS_FROM_ADDRESS',
      address,
    };

    try {
      const response = await sendMessage<ReviewDetailsResponse>(message);

      return response;
    } catch (error) {
      const err = error as Error;
      console.error('Error in fetchReviewDetailsByEthAddress:', err.message);

      return { success: false, reviewCount: 0, positivePercentage: 0, error: err.message };
    }
  }

  async fetchReviewDetailsByXHandle(handle: string): Promise<ReviewDetailsResponse> {
    const message: Message = {
      type: 'FETCH_REVIEW_DETAILS_FROM_HANDLE',
      handle,
    };

    try {
      const response = await sendMessage<ReviewDetailsResponse>(message);

      return response;
    } catch (error) {
      const err = error as Error;
      console.error('Error in fetchReviewDetailsByEthHandle:', err.message);

      return { success: false, reviewCount: 0, positivePercentage: 0, error: err.message };
    }
  }

  async fetchVouchDetailsByXHandle(handle: string): Promise<VouchDetailsResponse> {
    const message: Message = {
      type: 'FETCH_VOUCH_DETAILS_FROM_HANDLE',
      handle,
    };

    try {
      const response = await sendMessage<VouchDetailsResponse>(message);

      return response;
    } catch (error) {
      const err = error as Error;
      console.error('Error in fetchVouchDetails:', err.message);

      return { success: false, vouchCount: 0, vouchedInUSD: 0, error: err.message };
    }
  }

  async fetchVouchDetailsByEthAddress(address: string): Promise<VouchDetailsResponse> {
    const message: Message = {
      type: 'FETCH_VOUCH_DETAILS_FROM_ADDRESS',
      address,
    };

    try {
      const response = await sendMessage<VouchDetailsResponse>(message);

      return response;
    } catch (error) {
      const err = error as Error;
      console.error('Error in fetchVouchDetails:', err.message);

      return { success: false, vouchCount: 0, vouchedInUSD: 0, error: err.message };
    }
  }
}

export const dataFetchingService = new DataFetchingService();
