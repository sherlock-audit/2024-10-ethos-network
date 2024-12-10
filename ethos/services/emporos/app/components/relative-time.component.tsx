import { getDateFromUnix, getRelativeTime, getUnixTimestamp } from '@ethos/helpers';
import { Tooltip } from 'antd';

type RelativeDateTimeProps = {
  timestamp: number | Date;
  dateTimeFormat?: Intl.DateTimeFormatOptions;
  verbose?: boolean;
};

export function RelativeDateTime({
  timestamp,
  dateTimeFormat = { dateStyle: 'full', timeStyle: 'medium' },
  verbose = false,
}: RelativeDateTimeProps) {
  const time: number = typeof timestamp === 'number' ? timestamp : getUnixTimestamp(timestamp);

  const relativeTime = getRelativeTime(time) ?? 'Unknown';
  const displayText = verbose ? `${relativeTime} ago` : relativeTime;

  return (
    <Tooltip title={new Intl.DateTimeFormat('en', dateTimeFormat).format(getDateFromUnix(time))}>
      <span>{displayText}</span>
    </Tooltip>
  );
}
