import { css } from '@emotion/react';
import {
  type ActivityActor,
  fromUserKey,
  type RecentInteractionActivityActor,
} from '@ethos/domain';
import { Button, Card, Flex, Typography } from 'antd';
import { useRouter } from 'next/navigation';
// TODO: this is really bad, importing app specific code into shared components
import { profileRouteWithOptions } from '../../app/(root)/profile/profile-page.utils';
import { AuthMiddleware } from '../auth/auth-middleware';
import { UserAvatar } from '../avatar/avatar.component';
import { RelativeDateTime } from 'components/RelativeDateTime';
import { ProfileReviewScoreTag } from 'components/profile-review-score-tag/profile-review-score-tag.component';
import { tokenCssVars } from 'config/theme';
import { useRouteTo } from 'hooks/user/hooks';
import { useReviewStats } from 'hooks/user/lookup';

type ProfileReviewCardProps = {
  actor: ActivityActor | RecentInteractionActivityActor;
  displayReviewStats?: boolean;
  displayTransactionStats?: boolean;
  noBackground?: boolean;
  altTitle?: boolean;
  buttonAction?: () => void;
  actionType?: 'review' | 'vouch';
};

export function ProfileReviewCard({
  actor,
  displayReviewStats,
  displayTransactionStats,
  noBackground,
  altTitle,
  buttonAction,
  actionType = 'review',
}: ProfileReviewCardProps) {
  const router = useRouter();

  const targetRouteTo = useRouteTo(fromUserKey(actor.userkey)).data;
  const reviewStats = useReviewStats(fromUserKey(actor.userkey)).data;

  function action() {
    if (buttonAction) {
      buttonAction();
    } else {
      router.push(profileRouteWithOptions(targetRouteTo.profile, { modal: 'review' }));
    }
  }

  return (
    <Card
      css={css`
        background-color: ${noBackground ? 'transparent' : tokenCssVars.colorBgLayout};
      `}
    >
      <Flex vertical justify="space-between" align="center" gap={12} wrap={false}>
        <div>
          <UserAvatar actor={actor} size="large" />
        </div>
        {altTitle ? (
          <Typography.Title
            ellipsis
            level={5}
            css={css`
              width: 100%;
            `}
          >
            {actor.name}
          </Typography.Title>
        ) : (
          <Typography.Text
            ellipsis
            css={css`
              margin-top: 6px;
            `}
          >
            {actor.name}
          </Typography.Text>
        )}
        {displayReviewStats && (
          <div>
            <Typography.Text
              css={css`
                display: block;
                text-align: center;
              `}
            >
              Reviews
            </Typography.Text>
            <ProfileReviewScoreTag
              numReviews={reviewStats?.received ?? 0}
              positiveReviewsPercentage={reviewStats?.positiveReviewPercentage ?? 0}
              strong
            />
          </div>
        )}
        {displayTransactionStats && (
          <div>
            <Typography.Text
              css={css`
                display: block;
                text-align: center;
              `}
            >
              {'interaction' in actor && actor.interaction && (
                <RelativeDateTime timestamp={actor.interaction?.last_transaction_timestamp} />
              )}
            </Typography.Text>
            <Typography.Text
              css={css`
                display: block;
                text-align: center;
                color: ${tokenCssVars.colorPrimaryText};
              `}
            >
              {'interaction' in actor ? (actor.interaction?.transactions.length ?? 0) : 0}{' '}
              transactions
            </Typography.Text>
          </div>
        )}
        <AuthMiddleware>
          <Button type="primary" size="small" onClick={action}>
            {actionType === 'review' ? 'Review' : 'Vouch'}
          </Button>
        </AuthMiddleware>
      </Flex>
    </Card>
  );
}
