import { css } from '@emotion/react';
import {
  type ActivityActor,
  type ActivityInfo,
  type ActivityType,
  type EthosUserTarget,
  fromUserKey,
  reviewActivity,
  toUserKey,
  vouchActivity,
  X_SERVICE,
} from '@ethos/domain';
import { pluralize } from '@ethos/helpers';
import { useDynamicConfig } from '@statsig/react-bindings';
import { Avatar, Button, Col, Flex, theme, Typography } from 'antd';
import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import { UserAvatar } from 'components/avatar/avatar.component';
import { tokenCssVars } from 'config/theme';
import { dynamicConfigs } from 'constant/feature-flags';
import { useEthToUSD } from 'hooks/api/eth-to-usd-rate.hook';
import { parseDynamicProfileTargets } from 'hooks/api/related-profiles.hooks';
import {
  useActivityActorsBulk,
  useActor,
  useInfiniteRecentActivities,
} from 'hooks/user/activities';
import { useRouteTo } from 'hooks/user/hooks';
import { useReviewStats, useVouchStats } from 'hooks/user/lookup';

type CtaBanner = {
  title: string;
  description: ReactNode;
  buttonText: string;
};

export function ActivityCta({ target }: { target: EthosUserTarget }) {
  let cta: CtaBanner | null = null;
  let relevantProfiles: ActivityActor[] = [];
  const { token } = theme.useToken();
  const dynamicConfigData = useDynamicConfig(dynamicConfigs.activityCtaDefaultProfiles);

  const { data: defaultProfiles } = useActivityActorsBulk(
    parseDynamicProfileTargets(dynamicConfigData.value),
  );

  const actor = useActor(target);

  const targetRouteTo = useRouteTo(
    actor.username ? { service: X_SERVICE, username: actor.username } : fromUserKey(actor.userkey),
  ).data;

  const { data: activities } = useInfiniteRecentActivities({
    target: toUserKey(target),
    direction: 'subject',
    filter: [reviewActivity, vouchActivity],
    pagination: { limit: 50 },
  });

  const reviewStats = useReviewStats(target).data;
  const vouchStats = useVouchStats(target).data;
  const positiveReviewsPercentage = reviewStats?.positiveReviewPercentage ?? 0;
  const vouchedAmount = vouchStats?.staked.received ?? 0;
  const vouchedForInUSD = useEthToUSD(vouchStats?.staked.received ?? 0);

  const { ctaMemo, relevantProfilesMemo } = useMemo(() => {
    let cta: CtaBanner;
    let relevantProfiles: ActivityActor[] = [];

    if (vouchedAmount > 0.25) {
      relevantProfiles = getUniqueActorsByActivityType(activities?.values ?? [], vouchActivity);

      cta = {
        title: `${vouchedForInUSD}`,
        description: (
          <>
            Vouched for {actor.name} by{' '}
            <strong>
              {relevantProfiles[0]?.name ?? null}
              {vouchStats?.count.received && vouchStats?.count.received > 1
                ? ` and ${vouchStats?.count.received - 1} ${pluralize(vouchStats?.count.received - 1, 'other', 'others')}`
                : null}
            </strong>
          </>
        ),
        buttonText: 'See more',
      };
    } else if (positiveReviewsPercentage > 0) {
      relevantProfiles = getUniqueActorsByActivityType(activities?.values ?? [], reviewActivity);

      cta = {
        title: `${positiveReviewsPercentage.toFixed(2)}%`,
        description: (
          <>
            Positive reviews for {actor.name} by{' '}
            <strong>
              {relevantProfiles[0]?.name ?? null}
              {reviewStats?.received && reviewStats?.received > 1
                ? ` and ${reviewStats?.received - 1} ${pluralize(reviewStats?.received - 1, 'other', 'others')}`
                : null}
            </strong>
          </>
        ),
        buttonText: 'See more',
      };
    } else {
      cta = {
        title: 'See more',
        description: 'Jump into their profile to see reviews, vouches and other activity',
        buttonText: 'View',
      };
      relevantProfiles = defaultProfiles ?? [];
    }

    return { ctaMemo: cta, relevantProfilesMemo: relevantProfiles };
  }, [
    vouchedAmount,
    positiveReviewsPercentage,
    activities?.values,
    vouchedForInUSD,
    actor.name,
    vouchStats?.count.received,
    reviewStats?.received,
    defaultProfiles,
  ]);

  cta = ctaMemo;
  relevantProfiles = relevantProfilesMemo;

  return (
    <Col
      xs={{ span: 24 }}
      sm={{ span: 20, offset: 2 }}
      md={{ span: 16, offset: 4 }}
      lg={{ span: 14, offset: 5 }}
    >
      <Flex
        css={css`
          height: 116px;
          margin-bottom: 20px;
          padding: 0 36px;
          border-radius: 8px;
          background: ${tokenCssVars.colorPrimary};
          @media (max-width: ${token.screenSM}px) {
            padding: 0 16px;
          }
        `}
        align="center"
        justify="space-between"
      >
        <Flex vertical>
          <Typography.Title
            css={css`
              color: ${tokenCssVars.colorBgContainer};
            `}
            level={2}
          >
            {cta.title}
          </Typography.Title>
          <Typography.Text
            css={css`
              display: block;
              max-width: 240px;
              color: ${tokenCssVars.colorBgContainer};
            `}
          >
            {cta.description}
          </Typography.Text>
        </Flex>
        <Flex vertical gap={8} align="end">
          <Avatar.Group
            max={{
              count: 3,
              style: {
                color: tokenCssVars.colorPrimary,
                backgroundColor: tokenCssVars.colorBgLayout,
              },
            }}
            size={34}
          >
            {relevantProfiles.map((actor) => (
              <UserAvatar
                key={actor.userkey}
                actor={actor}
                size={34}
                showScore={false}
                showHoverCard={false}
                avatarCSS={css`
                  border: 3px solid ${tokenCssVars.colorPrimary} !important;
                `}
              />
            ))}
          </Avatar.Group>
          <Link href={targetRouteTo.profile}>
            <Button
              type="primary"
              css={css`
                color: ${tokenCssVars.colorPrimary};
                background: ${tokenCssVars.colorBgContainer};
              `}
            >
              {cta.buttonText}
            </Button>
          </Link>
        </Flex>
      </Flex>
    </Col>
  );
}

function getUniqueActorsByActivityType(
  activities: ActivityInfo[],
  activityType: ActivityType,
): ActivityActor[] {
  const uniqueProfiles = new Map();
  activities
    .filter((value) => value.type === activityType)
    .forEach((activity) => {
      if (!uniqueProfiles.has(activity.author.userkey)) {
        uniqueProfiles.set(activity.author.userkey, activity.author);
      }
    });

  return Array.from(uniqueProfiles.values()).slice(0, 3);
}
