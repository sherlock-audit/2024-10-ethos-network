const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31536000000],
  ['month', 2592000000],
  ['day', 86400000],
  ['hour', 3600000],
  ['minute', 60000],
  ['second', 1000],
];

const rtf = new Intl.RelativeTimeFormat('en', { style: 'narrow' });

export function getUnixTime(date: Date): number {
  return Math.round(date.getTime() / 1000);
}

/**
 *
 * @param ts timestamp in unix format in seconds
 */
export function getRelativeTime(ts: number): string | undefined {
  const elapsed = ts * 1000 - Date.now();

  for (const [unit, amount] of units) {
    if (Math.abs(elapsed) > amount || unit === 'second') {
      let formatted = rtf.format(Math.round(elapsed / amount), unit);
      // Remove directional words like "ago" or "in"
      formatted = formatted.replace(/(\s+ago|\s+in)$/i, '');

      return formatted;
    }
  }

  return undefined;
}

/**
 *
 * @param ts timestamp in unix format in seconds
 */
export function getDateFromUnix(ts: number | bigint): Date {
  return new Date(Number(ts) * 1000);
}

export function formatDate(timestamp: number | Date, options?: Intl.DateTimeFormatOptions): string {
  const dateFormatter = new Intl.DateTimeFormat('en', options);

  return dateFormatter.format(timestamp);
}

export function getUnixTimestamp(
  date: string | Date,
  precision: 'seconds' | 'milliseconds' | undefined = 'seconds',
): number {
  const value = (date instanceof Date ? date : new Date(date)).getTime() / 1000;

  return precision === 'seconds' ? Math.floor(value) : value;
}
