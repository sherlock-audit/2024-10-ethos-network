/* eslint-disable no-restricted-imports */
import { formatCurrency } from '@ethos/helpers/src/number';
import { dataFetchingService } from '../service/data-fetching-service.ts';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class ReviewAndVouchFetchHelper {
  public static async fetchReviewAndVouchDataByEthAddress(
    address: string,
  ): Promise<
    [positivePercentage: string, reviewCount: string, vouchedInUSD: string, vouchCount: string]
  > {
    try {
      const reviewDetails = await dataFetchingService.fetchReviewDetailsByEthAddress(address);
      const vouchDetails = await dataFetchingService.fetchVouchDetailsByEthAddress(address);
      const vouchedInUSDFormatted = formatCurrency(vouchDetails.vouchedInUSD, 'USD');

      return [
        reviewDetails.positivePercentage.toString(),
        reviewDetails.reviewCount.toString(),
        vouchedInUSDFormatted,
        vouchDetails.vouchCount.toString(),
      ];
    } catch (error) {
      console.error('Error fetching data:', error);
      throw new Error('Failed to fetch values');
    }
  }

  public static async fetchReviewAndVouchDataByXHandle(
    handle: string,
  ): Promise<
    [positivePercentage: string, reviewCount: string, vouchedInUSD: string, vouchCount: string]
  > {
    try {
      const reviewDetails = await dataFetchingService.fetchReviewDetailsByXHandle(handle);
      const vouchDetails = await dataFetchingService.fetchVouchDetailsByXHandle(handle);
      const vouchedInUSDFormatted = formatCurrency(vouchDetails.vouchedInUSD, 'USD');

      return [
        reviewDetails.positivePercentage.toString(),
        reviewDetails.reviewCount.toString(),
        vouchedInUSDFormatted,
        vouchDetails.vouchCount.toString(),
      ];
    } catch (error) {
      console.error('Error fetching data:', error);
      throw new Error('Failed to fetch values');
    }
  }
}
