import { type Fees } from '@ethos/blockchain-manager';
import { calculateVouchAmounts } from './vouch-form.utils';

describe('calculateVouchAmounts', () => {
  test('should calculate correct fees and total amount with fees', () => {
    const userVouchAmount = 1000;

    const fees: Fees = {
      entryProtocolFeeBasisPoints: 0n,
      exitFeeBasisPoints: 0n,
      entryDonationFeeBasisPoints: 400n, // 4%
      entryVouchersPoolFeeBasisPoints: 400n, // 4%
    };

    const result = calculateVouchAmounts(userVouchAmount, fees);

    const calculatedAmount = result.totalAmountWithFees;
    // Correct fee percentages
    const entryDonationFeePercentage = Number(fees.entryDonationFeeBasisPoints) / 10000;
    const entryVouchersPoolFeePercentage = Number(fees.entryVouchersPoolFeeBasisPoints) / 10000;
    const entryProtocolFeePercentage = Number(fees.entryProtocolFeeBasisPoints) / 10000;

    // Calculating expected fees based on the initial amount (userVouchAmount)
    const expectedEntryDonationFee = entryDonationFeePercentage * calculatedAmount;
    const expectedVouchersPoolFee = entryVouchersPoolFeePercentage * calculatedAmount;
    const expectedEntryProtocolFee = entryProtocolFeePercentage * calculatedAmount;

    const expectedTotalFees =
      expectedEntryDonationFee + expectedVouchersPoolFee + expectedEntryProtocolFee;
    const expectedTotalAmountWithFees = userVouchAmount + expectedTotalFees;

    // Validate the calculated total fees
    expect(result.totalFees).toBeCloseTo(expectedTotalFees, 7);

    // Validate the individual fees
    expect(result.entryDonationFee).toBeCloseTo(expectedEntryDonationFee, 7);
    expect(result.entryVouchersPoolFee).toBeCloseTo(expectedVouchersPoolFee, 7);
    expect(result.entryProtocolFee).toBeCloseTo(expectedEntryProtocolFee, 7);

    // Validate the total amount with fees
    expect(calculatedAmount).toBeCloseTo(expectedTotalAmountWithFees, 7);

    // Validate that the final amount after adding fees matches the original user vouch amount
    const finalAmountWithoutFees = calculatedAmount - expectedTotalFees;
    expect(finalAmountWithoutFees).toBeCloseTo(userVouchAmount, 7);
  });
});
