import { Flex, Typography } from 'antd';
import clsx from 'clsx';

export function TrustScore({
  impactTrend,
  formattedImpact,
  className,
}: {
  impactTrend: 'up' | 'down' | null;
  formattedImpact: string;
  className?: string;
}) {
  return (
    <Flex justify="space-between" gap={8} className={className}>
      <Typography.Text>Trust score</Typography.Text>
      <Typography.Text
        className={clsx('flex items-center justify-center gap-[1px]', {
          'text-antd-colorSuccess': impactTrend === 'up',
          'text-antd-colorError': impactTrend === 'down',
        })}
      >
        {impactTrend && <span>{impactTrend === 'up' ? '↑' : '↓'}</span>}
        {formattedImpact}
      </Typography.Text>
    </Flex>
  );
}
