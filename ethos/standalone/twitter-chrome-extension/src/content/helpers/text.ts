import { pluralize, toNumber } from '@ethos/helpers';

export function formatVouchers(voucherCount: string): string {
  const count = isNaN(parseInt(voucherCount, 10)) ? 0 : parseInt(voucherCount, 10);

  return `${count} ${pluralize(count, 'voucher', 'vouchers')}`;
}

export function formatReviews(reviewCount: string): string {
  const count = isNaN(parseInt(reviewCount, 10)) ? 0 : parseInt(reviewCount, 10);

  return `${count} ${pluralize(count, 'review', 'reviews')}`;
}

export function formatPercentage(percentage: string, fractionDigits = 0): string {
  const percentageNumber = toNumber(percentage);

  return `${percentageNumber.toFixed(fractionDigits)}%`;
}
