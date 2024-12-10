import { reviewActivity, vouchActivity, type ActivityInfo } from '@ethos/domain';
import { Button, Typography } from 'antd';
import { ActivityListItem } from 'app/(root)/profile/_components/activities/activity-list-item.component';
import { RelativeDateTime } from 'components/RelativeDateTime';
import { ReviewFilled } from 'components/icons';

export function ethosActivityText(activities: ActivityInfo[], showReviewModal: () => void) {
  const vouchActivities = activities.filter((activity) => activity.type === vouchActivity);
  const reviewActivities = activities.filter((activity) => activity.type === reviewActivity);

  return (
    <>
      {vouchActivities.map((activity) => (
        <>
          <ActivityListItem key={`vouch-${activity.data.id}`} activity={activity} />{' '}
          <RelativeDateTime timestamp={activity.timestamp} verbose />
        </>
      ))}
      {reviewActivities.slice(0, 2).map((activity) => (
        <>
          <ActivityListItem key={`review-${activity.data.id}`} activity={activity} />{' '}
          <RelativeDateTime timestamp={activity.timestamp} verbose />
        </>
      ))}
      {reviewActivities.length > 2 && (
        <>
          <Typography.Text>... and </Typography.Text>
          <Typography.Text>{reviewActivities.length - 2} more</Typography.Text>
        </>
      )}
      {vouchActivities.length === 0 && reviewActivities.length === 0 && (
        <Button ghost type="primary" size="small" icon={<ReviewFilled />} onClick={showReviewModal}>
          Leave Review
        </Button>
      )}
    </>
  );
}
