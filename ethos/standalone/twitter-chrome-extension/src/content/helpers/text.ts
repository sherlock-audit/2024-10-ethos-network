/* eslint-disable no-restricted-imports */
import { pluralize } from '@ethos/helpers/src/pluralize';

export function formatVouchers(voucherCount: string): string {
  const count = isNaN(parseInt(voucherCount)) ? 0 : parseInt(voucherCount);

  return `${count} ${pluralize(count, 'voucher', 'vouchers')}`;
}

export function formatReviews(reviewCount: string): string {
  const count = isNaN(parseInt(reviewCount)) ? 0 : parseInt(reviewCount);

  return `${count} ${pluralize(count, 'review', 'reviews')}`;
}

export function formatPercentage(percentage: string, fractionDigits = 0): string {
  const percentageNumber = toNumber(percentage);

  return `${percentageNumber.toFixed(fractionDigits)}%`;
}

export function capitalize(text: string): string {
  if (!text) return text;

  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function toNumber(value: string | number | undefined, fallback = 0): number {
  const numValue = Number(value);

  return isNaN(numValue) ? fallback : numValue;
}
