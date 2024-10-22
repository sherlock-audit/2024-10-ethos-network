'use client';
import { css } from '@emotion/react';
import { type ActivityActor, type EthosUserTarget, fromUserKey, toUserKey } from '@ethos/domain';
import { Flex, List, theme, Tooltip, Typography } from 'antd';
import { SidebarCard } from './sidebar-card.component';
import { UserAvatar } from 'components/avatar/avatar.component';
import { Groups, InviteFilled } from 'components/icons';
import { LoadingWrapper } from 'components/loading-wrapper/loading-wrapper.component';
import { PersonName } from 'components/person-name/person-name.component';
import { TooltipIconWrapper } from 'components/tooltip/tooltip-icon-wrapper';
import { useRecentProfiles } from 'hooks/api/echo.hooks';
import { placeholderActor, useActivityActorsBulk } from 'hooks/user/activities';

const { useToken } = theme;

const MAX_NUMBER_OF_PROFILES = 5;

export function RecentProfilesCard() {
  const { data: recentProfiles, isPending: isPendingRecentProfiles } =
    useRecentProfiles(MAX_NUMBER_OF_PROFILES);
  const { token } = useToken();

  const newProfileIds: EthosUserTarget[] =
    recentProfiles?.values?.map((p) => ({ profileId: p.id })) ?? [];
  const inviterProfileIds: EthosUserTarget[] =
    recentProfiles?.values?.map((p) => ({ profileId: p.invitedBy })) ?? [];
  const { data: recentActors = [], isPending: isPendingRecentActors } = useActivityActorsBulk([
    ...newProfileIds,
    ...inviterProfileIds,
  ]);

  const combined: Array<{ actor: ActivityActor; inviter: ActivityActor }> = [];

  recentProfiles?.values.forEach((profile) => {
    const actor = recentActors.find((a) => a.profileId === profile.id);
    const inviter = recentActors.find((a) => a.profileId === profile.invitedBy);

    if (actor) {
      combined.push({
        actor,
        inviter: inviter ?? placeholderActor(fromUserKey(actor.userkey)),
      });
    }
  });
  const isLoading = isPendingRecentProfiles || isPendingRecentActors;

  return (
    <SidebarCard
      title="New profiles"
      icon={
        <Groups
          css={css`
            /* The icon is not taking the entire height of the square so making it sightly bigger to make more significant */
            font-size: 18px;
          `}
        />
      }
    >
      <LoadingWrapper
        size={MAX_NUMBER_OF_PROFILES}
        isLoading={isLoading}
        type="skeletonList"
        isEmpty={!combined?.length}
      >
        <List dataSource={combined}>
          {combined.map(({ actor, inviter }) => {
            // Change userkey to be based on address so we have correct profile
            // links
            // TODO: Remove this once we switch to a better approach with using
            // profileId everywhere
            const profile = {
              ...actor,
              userkey: toUserKey({ address: actor.primaryAddress }),
            };
            const inviterWithAddress = {
              ...inviter,
              userkey: toUserKey({ address: inviter.primaryAddress }),
            };

            return (
              <List.Item key={actor.profileId}>
                <Flex gap={8} align="center">
                  <UserAvatar actor={profile} />
                  <Flex vertical>
                    <Typography.Text
                      css={css`
                        max-width: calc(150px - ${token.paddingContentHorizontal * 2}px);
                      `}
                      ellipsis
                    >
                      <PersonName weight="default" target={profile} />
                    </Typography.Text>

                    <Typography.Text
                      type="secondary"
                      css={css`
                        max-width: calc(150px - ${token.paddingContentHorizontal * 2}px);
                      `}
                      ellipsis
                    >
                      <Tooltip title="Invited by">
                        <TooltipIconWrapper>
                          <InviteFilled />
                        </TooltipIconWrapper>
                      </Tooltip>{' '}
                      <PersonName
                        size="default"
                        weight="default"
                        color="colorTextSecondary"
                        target={inviterWithAddress}
                      />
                    </Typography.Text>
                  </Flex>
                </Flex>
              </List.Item>
            );
          })}
        </List>
      </LoadingWrapper>
    </SidebarCard>
  );
}
