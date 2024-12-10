import { formatEther, parseUnits } from 'viem';

const ETH_SUFFIX = 'e';

const defaultOptions: Intl.NumberFormatOptions = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
  notation: 'compact',
  style: 'decimal',
};

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('en', { ...defaultOptions, ...options }).format(value);
}

export function formatCurrency(
  value: number,
  currency: 'USD' | 'ETH',
  options?: Intl.NumberFormatOptions,
): string {
  return formatNumber(value, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    ...options,
  });
}

export function formatEth(amount: number, unit?: 'eth', options?: Intl.NumberFormatOptions): string;
export function formatEth(
  amount: bigint,
  unit?: 'wei' | 'gwei',
  options?: Intl.NumberFormatOptions,
): string;
export function formatEth(
  amount: bigint | number,
  unit: 'eth' | 'wei' | 'gwei' = 'wei',
  options?: Intl.NumberFormatOptions,
): string {
  const ethAmount =
    typeof amount === 'number' && unit === 'eth'
      ? parseUnits(amount.toFixed(18), 18)
      : BigInt(amount);
  const ethUnit = unit === 'eth' ? 'wei' : unit;

  const formattedAmount = formatNumber(Number(formatEther(ethAmount, ethUnit)), {
    maximumFractionDigits: 3,
    ...options,
  });

  return `${formattedAmount}${ETH_SUFFIX}`;
}

export function toNumber(value: string | number | unknown, fallbackValue = 0): number {
  const numValue = Number(value);

  return isNaN(numValue) ? fallbackValue : numValue;
}

/* This is meant to be used to simplify Contributor XP scores.
it does not scale past 10 million, but should be fine for now. In the future
if we need to add more tiers we can come back and do that later.
The intent here is to show 4 digits + 1 suffix character (k, M)
*/
export function formatXPScore(value: number): string {
  if (value < 10_000) {
    return value.toString();
  }

  const formatter = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits:
      value >= 10_000_000
        ? 1 // 10M+: XX.XM
        : value >= 1_000_000
          ? 2 // 1M-9.99M: X.XXM
          : value >= 100_000
            ? 0 // 100k-999k: XXXk
            : value >= 10_000
              ? 1 // 10k-99.9k: XX.Xk
              : 2, // fallback
    minimumFractionDigits: 0,
  });

  return formatter.format(value).toLowerCase();
}
