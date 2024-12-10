import { type EthosUserTarget } from '@ethos/domain';
import { pluralize } from '@ethos/helpers';
import { Flex, type FlexProps, Tooltip, Typography } from 'antd';
import { ReviewFilled } from 'components/icons';
import { TooltipIconWrapper } from 'components/tooltip/tooltip-icon-wrapper';
import { useReviewStats } from 'hooks/user/lookup';

const { Text } = Typography;

type Props = {
  target: EthosUserTarget;
  isCompact?: boolean;
};

export function ReviewStats({ target, isCompact = true }: Props) {
  const { data: reviewStats } = useReviewStats(target);
  const hasReviews = reviewStats?.received && reviewStats?.received > 0;

  if (!hasReviews) {
    return <Text type="secondary">No reviews</Text>;
  }

  return (
    <Text type="secondary" ellipsis>
      <Text strong type="secondary">
        {(reviewStats?.positiveReviewPercentage ?? 0).toFixed(0)}%
      </Text>{' '}
      positive ({reviewStats?.received}
      {isCompact ? '' : ` ${pluralize(reviewStats?.received, 'review', 'reviews')}`})
    </Text>
  );
}

export function ReviewStatsRow({
  target,
  isCompact = true,
  ...props
}: Props & Omit<FlexProps, 'children'>) {
  return (
    <Flex gap={6} align="center" {...props}>
      <Tooltip title="Reviews">
        <TooltipIconWrapper>
          <ReviewFilled />
        </TooltipIconWrapper>
      </Tooltip>
      <ReviewStats target={target} isCompact={isCompact} />
    </Flex>
  );
}
