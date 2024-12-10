import { type Fees } from '@ethos/blockchain-manager';
import { formatEth } from '@ethos/helpers';

// Example Usage:
// Suppose we have an amount of 1 ETH and the following fee structure:
// entryProtocolFeeBasisPoints = 0 (0%)
// exitFeeBasisPoints = 0 (0%)
// entryDonationFeeBasisPoints = 400 (4%)
// entryVouchersPoolFeeBasisPoints = 400 (4%)
//
// The calculations would proceed as follows:
//
// 1. Call the `calculateAmounts` function:
// const amount = 1; // 1 ETH
// const fees = {
//   entryProtocolFeeBasisPoints: 0,
//   exitFeeBasisPoints: 0,
//   entryDonationFeeBasisPoints: 400,
//   entryVouchersPoolFeeBasisPoints: 400,
// };
// const amounts = calculateAmounts(amount, fees);
//
// 2. Total Fee Percentage:
// Total Fee Percentage = (0 + 0 + 400 + 400) / 10000 = 0.08 (8%)
//
// 3. Total Fee Amount:
// Total Fee Amount = calculateFeeAmount(1, 0.08) = 1 / (1 - 0.08) - 1 = 0.0869565217 ETH
//
// 4. Individual Fees:
// Each individual fee is calculated proportionally based on their percentage from the total fee percentage (8%).
// Entry Protocol Fee = 0 ETH (0% of total amount)
// Exit Fee = 0 ETH (0% of total amount)
// Entry Donation Fee = (400 / 10000 / 0.08) * 0.0869565217 ≈ 0.0434782609 ETH
// Entry Vouchers Pool Fee = (400 / 10000 / 0.08) * 0.0869565217 ≈ 0.0434782609 ETH
//
// 5. Total Fees:
// Total Fees = 0 + 0 + 0.0434782609 + 0.0434782609 ≈ 0.0869565217 ETH
//
// 6. Total Amount with Fees:
// Total Amount with Fees = 1 + 0.0869565217 ≈ 1.0869565217 ETH

/**
 * Calculates the fee based on the given amount and the fee percentage.
 *
 * @param amount - The amount after the fee has been applied.
 * @param feePercentage - The percentage of the fee (as a decimal, e.g., 0.04 for 4%).
 * @returns The amount of the fee that was deducted from the original amount.
 */
function calculateFeeAmount(amount: number, feePercentage: number): number {
  return amount * (feePercentage / (1 - feePercentage));
}

/**
 * Calculates the individual fee amount based on the provided basis points,
 * total fee amount, and total fee percentage.
 *
 * @param basisPoints - The basis points as fee percentage (e.g., 400 == 4%).
 * @param totalFeeAmount - The total fee amount that has been calculated before.
 * @param totalFeePercentage - The total percentage of all fees combined (as a decimal e.g. 0.04).
 * @returns The calculated individual fee amount.
 */
function calculateIndividualFee(
  basisPoints: number,
  totalFeeAmount: number,
  totalFeePercentage: number,
): number {
  const percentage = basisPoints / 10000;

  return (percentage / totalFeePercentage) * totalFeeAmount;
}

/**
 * Calculates the total fees and the amounts with fees applied based on the provided amount and fee configuration.
 *
 * @param amount - The initial amount before any fees are applied.
 * @param fees - An object containing the fee structure (e.g., entry protocol fee, exit fee, etc.).
 * @returns An object containing:
 * - amount: The initial amount.
 * - entryProtocolFee: The calculated entry protocol fee.
 * - exitFee: The calculated exit fee.
 * - entryDonationFee: The calculated entry donation fee.
 * - entryVouchersPoolFee: The calculated entry vouchers pool fee.
 * - totalFees: The total of all fees calculated.
 * - totalAmountWithFees: The total amount after adding the calculated fees.
 */
export function calculateVouchAmounts(amount: number, fees: Fees) {
  const totalFeePercentage =
    (Number(fees.entryProtocolFeeBasisPoints) +
      Number(fees.exitFeeBasisPoints) +
      Number(fees.entryDonationFeeBasisPoints) +
      Number(fees.entryVouchersPoolFeeBasisPoints)) /
    10000;

  const totalFeeAmount = calculateFeeAmount(amount, totalFeePercentage);

  const entryProtocolFee = calculateIndividualFee(
    Number(fees.entryProtocolFeeBasisPoints),
    totalFeeAmount,
    totalFeePercentage,
  );
  const entryDonationFee = calculateIndividualFee(
    Number(fees.entryDonationFeeBasisPoints),
    totalFeeAmount,
    totalFeePercentage,
  );
  const entryVouchersPoolFee = calculateIndividualFee(
    Number(fees.entryVouchersPoolFeeBasisPoints),
    totalFeeAmount,
    totalFeePercentage,
  );

  const totalAmountWithFees = amount + totalFeeAmount;

  const totalFees = entryProtocolFee + entryDonationFee + entryVouchersPoolFee;

  return {
    amount,
    entryProtocolFee,
    entryDonationFee,
    entryVouchersPoolFee,
    totalFees,
    totalAmountWithFees,
  };
}

const ethFormatterOption = { maximumFractionDigits: 5 };

function formatFee(fee: number) {
  return fee > 0 ? formatEth(fee, 'eth', ethFormatterOption) : undefined;
}

/**
 * Formats the amounts calculated by the `calculateAmounts`.
 *
 * @param amounts - An object containing amounts returned by the `calculateAmounts` function.
 * @returns An object with formatted amounts:
 * - formattedAmount: The formatted amount before fees.
 * - formattedEntryProtocolFee: The formatted entry protocol fee, or undefined if the fee is 0.
 * - formattedEntryVouchersPoolFee: The formatted entry vouchers pool fee, or undefined if the fee is 0.
 * - formattedEntryDonationFee: The formatted entry donation fee, or undefined if the fee is 0.
 * - formattedExitFee: The formatted exit fee, or undefined if the fee is 0.
 * - formattedTotalFees: The formatted total fees.
 * - formattedTotalAmountWithFees: The formatted total amount after including fees.
 */
export function formatVouchAmounts(amounts: ReturnType<typeof calculateVouchAmounts>) {
  const {
    amount,
    entryDonationFee,
    entryProtocolFee,
    entryVouchersPoolFee,
    totalFees,
    totalAmountWithFees,
  } = amounts;

  return {
    formattedAmount: formatEth(amount, 'eth', ethFormatterOption),
    formattedEntryProtocolFee: formatFee(entryProtocolFee),
    formattedEntryVouchersPoolFee: formatFee(entryVouchersPoolFee),
    formattedEntryDonationFee: formatFee(entryDonationFee),
    formattedTotalFees: formatEth(totalFees, 'eth', ethFormatterOption),
    formattedTotalAmountWithFees: formatEth(totalAmountWithFees, 'eth', ethFormatterOption),
  };
}
