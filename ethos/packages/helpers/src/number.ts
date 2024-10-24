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
