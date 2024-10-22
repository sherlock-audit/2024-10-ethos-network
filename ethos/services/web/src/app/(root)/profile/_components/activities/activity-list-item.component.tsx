import { type Review } from '@ethos/blockchain-manager';
import {
  type ActivityInfo,
  attestationActivity,
  invitationAcceptedActivity,
  reviewActivity,
  unvouchActivity,
  vouchActivity,
} from '@ethos/domain';
import { Flex, Typography, theme } from 'antd';
import Link from 'next/link';
import {
  ActivityTypeIcon,
  type ActivityTypeIconProps,
} from 'components/activity-cards/card-header-title.component';
import { useScoreIconAndColor } from 'hooks/user/useScoreIconAndColor';
import { getActivityUrl } from 'utils/routing';

function getActivityTitle(type: ActivityTypeIconProps['type'], score?: Review['score']): string {
  switch (type) {
    case attestationActivity: {
      return 'Social Connected';
    }
    case invitationAcceptedActivity: {
      return 'Invitation Accepted';
    }
    case reviewActivity: {
      return score ? `${score} Review` : 'Review';
    }
    case vouchActivity: {
      return 'Vouch';
    }
    case unvouchActivity: {
      return 'Unvouch';
    }
    default: {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unhandled type: ${type}`);
    }
  }
}

export function ActivityListItem({ activity }: { activity: ActivityInfo }) {
  const { token } = theme.useToken();
  const { COLOR_BY_SCORE } = useScoreIconAndColor();

  return (
    <Flex align="center" gap={5}>
      <ActivityTypeIcon
        type={activity.type}
        color={activity.type === 'review' ? COLOR_BY_SCORE[activity.data.score] : undefined}
      />
      <Link href={getActivityUrl(activity)}>
        <Typography.Text
          css={{
            textTransform: 'capitalize',
            fontSize: token.fontSize,
          }}
        >
          {getActivityTitle(
            activity.type,
            activity.type === reviewActivity ? activity.data.score : undefined,
          )}
        </Typography.Text>
      </Link>
    </Flex>
  );
}
