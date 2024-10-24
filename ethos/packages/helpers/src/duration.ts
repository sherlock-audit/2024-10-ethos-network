/**
 * Duration constant for one minute in seconds
 */
const MINUTE = 60;

/**
 * Duration constant for one hour in seconds
 */

const HOUR = 60 * 60;

/**
 * Duration constant for one day in seconds
 */
const DAY = HOUR * 24;

/**
 * Duration constant for one year in seconds
 */
const YEAR = DAY * 365;

/**
 * Duration constant for one minute in milliseconds
 */
const MILLISECONDS_PER_MINUTE = MINUTE * 1000;

/**
 * Duration constant for one hour in milliseconds
 */
const MILLISECONDS_PER_HOUR = HOUR * 1000;

/**
 * Duration constant for one day in milliseconds
 */
const MILLISECONDS_PER_DAY = DAY * 1000;

/**
 * Duration constant for one year in milliseconds
 */
const MILLISECONDS_PER_YEAR = YEAR * 1000;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function duration(
  v: number,
  unit:
    | 'ms'
    | 'millisecond'
    | 'milliseconds'
    | 'second'
    | 'seconds'
    | 'minute'
    | 'minutes'
    | 'hour'
    | 'hours'
    | 'day'
    | 'days'
    | 'year'
    | 'years',
) {
  const value = (() => {
    switch (unit) {
      case 'ms':
      case 'millisecond':
      case 'milliseconds':
        return v;
      case 'second':
      case 'seconds':
        return v * 1000;
      case 'minute':
      case 'minutes':
        return v * MILLISECONDS_PER_MINUTE;
      case 'hour':
      case 'hours':
        return v * MILLISECONDS_PER_HOUR;
      case 'day':
      case 'days':
        return v * MILLISECONDS_PER_DAY;
      case 'year':
      case 'years':
        return v * MILLISECONDS_PER_YEAR;
    }
  })();

  return {
    toMilliseconds() {
      return value;
    },
    toSeconds() {
      return value / 1000;
    },
    toMinutes() {
      return value / MILLISECONDS_PER_MINUTE;
    },
    toHours() {
      return value / MILLISECONDS_PER_HOUR;
    },
    toDays() {
      return value / MILLISECONDS_PER_DAY;
    },
    toYears() {
      return value / MILLISECONDS_PER_YEAR;
    },
  };
}
