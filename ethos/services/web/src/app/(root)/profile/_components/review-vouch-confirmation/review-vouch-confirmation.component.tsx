import { css } from '@emotion/react';
import { xComHelpers } from '@ethos/attestation';
import {
  type ActivityInfo,
  type ActivityType,
  fromUserKey,
  reviewActivity,
  ScoreImpact,
  vouchActivity,
} from '@ethos/domain';
import { formatEth } from '@ethos/helpers';
import { Button, Divider, Flex, Skeleton, theme, Typography } from 'antd';
import { tokenCssVars } from '../../../../../config';
import { ReviewCard } from 'components/activity-cards/review-card.component';
import { VouchCard } from 'components/activity-cards/vouch-card.component';
import { UserAvatar } from 'components/avatar/avatar.component';
import { EthosStar } from 'components/icons';
import { ScoreDifference } from 'components/score-difference/score-difference.component';
import { useCurrentUser } from 'contexts/current-user.context';
import { useActivity, useActor } from 'hooks/user/activities';
import { getActivityUrl } from 'utils/routing';

type Props =
  | { id: number; txHash?: never; activityType: ActivityType; close: (successful: boolean) => void }
  | {
      id?: never;
      txHash: string;
      activityType: ActivityType;
      close: (successful: boolean) => void;
    };

export function ReviewVouchConfirmation({ id, activityType, txHash, close }: Props) {
  const { token } = theme.useToken();
  const { connectedProfile } = useCurrentUser();
  const { data: activity, isFetched } = useActivity(
    activityType,
    txHash ?? id ?? 0,
    connectedProfile?.id,
  );

  const subjectActivityActor = useActor(fromUserKey(activity?.subject?.userkey ?? 'profileId:-1'));

  const scoreImpact =
    activity?.type === reviewActivity
      ? activity?.data.score === 'positive'
        ? ScoreImpact.POSITIVE
        : ScoreImpact.NEGATIVE
      : ScoreImpact.POSITIVE;

  function twitterShare() {
    if (!activity) return;

    const url = getActivityUrl(activity, true);
    const twitterHandle =
      (activity.subject.username ? `${activity.subject.username}` : null) ??
      activity.subject.name ??
      '';
    let tweet = '';

    if (activity.type === reviewActivity) {
      tweet = xComHelpers.shareReviewTweetContent(url, activity.data.score, twitterHandle);
    }
    if (activity.type === vouchActivity) {
      tweet = xComHelpers.shareVouchTweetContent(
        url,
        formatEth(activity.data.archived ? activity.data.withdrawn : activity.data.balance),
        twitterHandle,
      );
    }

    window.open(xComHelpers.generateIntentTweetUrl(tweet));
  }

  if (!isFetched || !activity) {
    return (
      <Flex
        vertical
        align="center"
        gap={40}
        css={css`
          width: 100%;
          padding-top: 80px;
        `}
      >
        <Flex justify="center" gap={77}>
          <Flex vertical align="center" gap={12}>
            <Skeleton.Node
              css={css`
                width: 120px;
                height: 20px;
              `}
              active
            />
            <Skeleton.Avatar size={100} active />

            <Skeleton.Node
              css={css`
                width: 60px;
                height: 20px;
              `}
              active
            />
          </Flex>
          <Flex vertical align="center" gap={12}>
            <Skeleton.Node
              css={css`
                width: 120px;
                height: 20px;
              `}
              active
            />
            <Skeleton.Avatar size={100} active />

            <Skeleton.Node
              css={css`
                width: 60px;
                height: 20px;
              `}
              active
            />
          </Flex>
        </Flex>
        <Flex
          css={css`
            width: 100%;
            padding: 20px;
          `}
        >
          <Skeleton active />
        </Flex>
      </Flex>
    );
  }

  return (
    <>
      <Flex
        vertical
        gap={2}
        align="center"
        css={css`
          background: ${tokenCssVars.colorFill};
          padding: 20px 0 18px;
          border-radius: ${token.borderRadius}px ${token.borderRadius}px 0 0;
        `}
      >
        <Typography.Title level={3}>
          {activity?.type === reviewActivity ? `Review ` : null}
          {activity?.type === vouchActivity ? `Vouch ` : null}
          submitted
        </Typography.Title>
      </Flex>
      <Flex
        justify="space-evenly"
        css={css`
          padding: 14px 0;
        `}
      >
        <Flex vertical gap={18} align="center">
          <Typography.Title level={3}>{activity?.subject.name}</Typography.Title>
          <UserAvatar actor={subjectActivityActor} showHoverCard={false} size={100} />
          <ScoreDifference score={8} impact={scoreImpact} />
        </Flex>
        <Flex vertical gap={18} align="center">
          <Typography.Title level={3}>Your XP</Typography.Title>
          <Flex
            align="center"
            justify="center"
            vertical
            gap={4}
            css={css`
              background: #006d75;
              color: ${tokenCssVars.colorBgContainer};
              font-size: 28px;
              width: 100px;
              height: 100px;
              border-radius: 50%;
            `}
          >
            <EthosStar />
            <Typography.Title
              level={2}
              css={css`
                color: ${tokenCssVars.colorBgContainer};
              `}
            >
              0
            </Typography.Title>
          </Flex>
          <Typography.Text
            type="success"
            css={css`
              font-size: ${token.fontSizeLG}px;
              font-weight: ${token.fontWeightStrong};
            `}
          >
            Coming soon
          </Typography.Text>
        </Flex>
      </Flex>
      <Divider
        css={css`
          border-color: ${tokenCssVars.colorFillSecondary};
          margin: 0;
        `}
        variant="solid"
      />
      <Flex
        vertical
        align="center"
        justify="center"
        gap={12}
        css={css`
          padding-inline: 10px;
        `}
      >
        <Flex
          css={css`
            padding: 12px 14px 0;
          `}
        >
          <Typography.Title level={3}>Share your {activityType}</Typography.Title>
        </Flex>
        {activity ? <ActivityCard activity={activity} /> : null}

        <Flex
          gap={10}
          css={css`
            margin-bottom: 20px;
            margin-top: 8px;
          `}
        >
          <Button
            type="text"
            css={css`
              color: ${tokenCssVars.colorPrimary};
            `}
            onClick={() => {
              close(true);
            }}
          >
            Close
          </Button>
          <Button type="primary" onClick={twitterShare}>
            Share on x.com
          </Button>
        </Flex>
      </Flex>
    </>
  );
}

function ActivityCard({ activity }: { activity: ActivityInfo }) {
  return (
    <>
      {activity.type === reviewActivity && (
        <ReviewCard
          info={activity}
          hideFooter
          hideReviewTypeIndicator
          hideActions
          hideTimestamp
          inlineClipboardIcon
          shadowed
        />
      )}

      {activity.type === vouchActivity && (
        <VouchCard
          info={activity}
          hideFooter
          hideActions
          hideTimestamp
          inlineClipboardIcon
          shadowed
        />
      )}
    </>
  );
}
