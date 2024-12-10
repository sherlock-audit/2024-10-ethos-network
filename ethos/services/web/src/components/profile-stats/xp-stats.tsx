import { InfoCircleOutlined } from '@ant-design/icons';
import { type LiteProfile } from '@ethos/domain';
import { formatXPScore } from '@ethos/helpers';
import { type FlexProps, Flex, Tooltip, Typography } from 'antd';
import Link from 'next/link';
import { EthosStar } from 'components/icons';
import { TooltipIconWrapper } from 'components/tooltip/tooltip-icon-wrapper';
import { useContributionStats } from 'hooks/api/echo.hooks';

type Props = {
  profile: LiteProfile | null | undefined;
  xpPageUrl: string;
} & Omit<FlexProps, 'children'>;

export function XPStatsRow({ profile, xpPageUrl, ...props }: Props) {
  const { data: stats } = useContributionStats({
    profileId: profile?.id ?? -1,
  });

  return (
    <Flex gap={6} align="center" {...props}>
      <Tooltip title="Contributor XP">
        <TooltipIconWrapper>
          <EthosStar />
        </TooltipIconWrapper>
      </Tooltip>
      <Typography.Text type="secondary" ellipsis>
        <strong>{formatXPScore(stats?.totalXp ?? 0)}</strong> Contributor XP{' '}
        {profile?.id && (
          <Tooltip title="View Contributor XP history">
            <Link href={xpPageUrl}>
              <InfoCircleOutlined />
            </Link>
          </Tooltip>
        )}
      </Typography.Text>
    </Flex>
  );
}
