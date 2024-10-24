'use client';
import { css } from '@emotion/react';
import { type ActivityActor, fromUserKey } from '@ethos/domain';
import { isAddressEqualSafe } from '@ethos/helpers';
import { Button, Flex, List, Tooltip, Typography } from 'antd';
import { SidebarCard } from './sidebar-card.component';
import { profileRouteWithOptions } from 'app/(root)/profile/profile-page.utils';
import { AuthMiddleware } from 'components/auth/auth-middleware';
import { UserAvatar } from 'components/avatar/avatar.component';
import { InviteFilled, ReviewFilled, TrophyFilled } from 'components/icons';
import { LoadingWrapper } from 'components/loading-wrapper/loading-wrapper.component';
import { PersonName } from 'components/person-name/person-name.component';
import { TooltipIconWrapper } from 'components/tooltip/tooltip-icon-wrapper';
import { useCurrentUser } from 'contexts/current-user.context';
import { useHighestScoringActors } from 'hooks/api/echo.hooks';
import { useRouteTo } from 'hooks/user/hooks';

const MAX_NUMBER_OF_PROFILES = 5;

export function HighestScoringProfilesCard() {
  const { status: connectedAddressStatus, connectedAddress } = useCurrentUser();

  const { data, isPending } = useHighestScoringActors(MAX_NUMBER_OF_PROFILES);

  const isLoading = isPending && connectedAddressStatus !== 'connecting';

  return (
    <SidebarCard title="Highest scores" icon={<TrophyFilled />}>
      <LoadingWrapper
        size={MAX_NUMBER_OF_PROFILES}
        isLoading={isLoading}
        type="skeletonList"
        isEmpty={!data?.length}
      >
        <Flex
          justify="center"
          align="center"
          gap={12}
          vertical
          css={css`
            min-height: 100px;
          `}
        >
          <List
            css={css`
              width: 100%;
            `}
            dataSource={data}
          >
            {data?.map(({ profileActor, inviterActor }) => (
              <List.Item key={profileActor.userkey}>
                <HighestScoreProfileCard
                  profileActor={profileActor}
                  inviterActor={inviterActor}
                  isCurrentUser={Boolean(
                    connectedAddress &&
                      isAddressEqualSafe(profileActor.primaryAddress, connectedAddress),
                  )}
                />
              </List.Item>
            ))}
          </List>
        </Flex>
      </LoadingWrapper>
    </SidebarCard>
  );
}

type HighestScoreProfileCardProps = {
  profileActor: ActivityActor;
  inviterActor?: ActivityActor;
  isCurrentUser: boolean;
};
function HighestScoreProfileCard({
  profileActor,
  inviterActor,
  isCurrentUser,
}: HighestScoreProfileCardProps) {
  const targetRouteTo = useRouteTo(fromUserKey(profileActor.userkey)).data;

  return (
    <Flex
      justify="space-between"
      align="center"
      gap={8}
      css={css`
        width: 100%;
      `}
    >
      <UserAvatar actor={profileActor} size={40} />

      <Flex
        vertical
        css={css`
          flex: 1;
          min-width: 0;
        `}
      >
        <PersonName weight="default" target={profileActor} ellipsis />
        {inviterActor && (
          <Typography.Text type="secondary">
            <Flex gap={4} align="baseline">
              <Tooltip title="Invited by">
                <TooltipIconWrapper>
                  <InviteFilled />
                </TooltipIconWrapper>
              </Tooltip>
              <PersonName
                size="default"
                weight="default"
                color="colorTextSecondary"
                target={inviterActor}
                ellipsis
              />
            </Flex>
          </Typography.Text>
        )}
      </Flex>

      <Tooltip title={isCurrentUser ? 'That’s you! 🎉' : 'Write a review'}>
        <AuthMiddleware>
          <Button
            color="primary"
            variant="filled"
            size="small"
            icon={<ReviewFilled />}
            disabled={isCurrentUser}
            href={profileRouteWithOptions(targetRouteTo.profile, { modal: 'review' })}
          />
        </AuthMiddleware>
      </Tooltip>
    </Flex>
  );
}
