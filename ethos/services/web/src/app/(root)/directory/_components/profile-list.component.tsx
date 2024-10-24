import { type EthosUserTarget, type ActivityActor, fromUserKey, toUserKey } from '@ethos/domain';
import { formatDate, getDateFromUnix } from '@ethos/helpers';
import { Flex, Table, type TableProps, Typography, Tooltip } from 'antd';
import { RelativeDateTime } from 'components/RelativeDateTime';
import { UserAvatar } from 'components/avatar/avatar.component';
import { InviteFilled, Logo } from 'components/icons';
import { PersonName } from 'components/person-name/person-name.component';
import { TableWrapper } from 'components/table/TableWrapper';
import { TooltipIconWrapper } from 'components/tooltip/tooltip-icon-wrapper';
import { useRecentProfiles } from 'hooks/api/echo.hooks';
import { placeholderActor, useActivityActorsBulk } from 'hooks/user/activities';

type Profile = {
  actor: ActivityActor;
  inviter: ActivityActor;
  profileCreatedAt: number;
};

export function ProfileList() {
  const { data: recentProfiles, isLoading: isLoadingRecentProfiles } = useRecentProfiles(100);

  const newProfileIds: EthosUserTarget[] =
    recentProfiles?.values?.map((p) => ({ profileId: p.id })) ?? [];
  const inviterProfileIds: EthosUserTarget[] =
    recentProfiles?.values?.map((p) => ({ profileId: p.invitedBy })) ?? [];
  const { data: recentActors = [] } = useActivityActorsBulk([
    ...newProfileIds,
    ...inviterProfileIds,
  ]);

  const combined: Profile[] = [];

  recentProfiles?.values.forEach((profile) => {
    const actor = recentActors.find((a) => a.profileId === profile.id);
    const inviter = recentActors.find((a) => a.profileId === profile.invitedBy);
    const profileCreatedAt = profile.createdAt;

    if (actor) {
      combined.push({
        actor,
        inviter: inviter ?? placeholderActor(fromUserKey(actor.userkey)),
        profileCreatedAt,
      });
    }
  });

  const columns: TableProps<Profile>['columns'] = [
    {
      title: 'Ethos user',
      key: 'actorAddress',
      width: 250,
      render: (_: unknown, record: { actor: ActivityActor; inviter: ActivityActor }) => {
        // Change userkey to be based on address so we have correct profile
        // links
        // TODO: Remove this once we switch to a better approach with using
        // profileId everywhere
        const profile = {
          ...record.actor,
          userkey: toUserKey({ address: record.actor.primaryAddress }),
        };
        const inviter = {
          ...record.inviter,
          userkey: toUserKey({ address: record.inviter.primaryAddress }),
        };

        return (
          <Flex gap={12} align="center">
            <UserAvatar actor={profile} />
            <Flex vertical>
              <PersonName color="colorText" target={profile} />
              <Typography.Text type="secondary">
                <Tooltip title="Invited by">
                  <TooltipIconWrapper>
                    <InviteFilled />
                  </TooltipIconWrapper>
                </Tooltip>{' '}
                <PersonName size="small" weight="default" target={inviter} />
              </Typography.Text>
            </Flex>
          </Flex>
        );
      },
    },
    {
      title: 'Joined on',
      dataIndex: 'profileCreatedAt',
      key: 'profileCreatedAt',
      sorter: (a: Profile, b: Profile) => a.profileCreatedAt - b.profileCreatedAt,
      render: (profileCreatedAt: number) => {
        return (
          <Typography.Text>
            <Flex vertical gap={4}>
              {formatDate(getDateFromUnix(profileCreatedAt), {
                dateStyle: 'medium',
              })}
              <Typography.Text type="secondary">
                (<RelativeDateTime timestamp={profileCreatedAt} verbose />)
              </Typography.Text>
            </Flex>
          </Typography.Text>
        );
      },
    },
    {
      title: 'Bio',
      dataIndex: ['actor', 'description'],
      key: 'bio',
      width: 400,
      render: (description: string) => {
        return <Typography.Text>{description}</Typography.Text>;
      },
    },
    {
      title: 'Ethos Score',
      dataIndex: ['actor', 'score'],
      defaultSortOrder: 'descend',
      sorter: (
        a: { actor: ActivityActor; inviter: ActivityActor },
        b: { actor: ActivityActor; inviter: ActivityActor },
      ) => a.actor.score - b.actor.score,
      key: 'score',
      render: (score: number) => {
        return (
          <Typography.Title level={1}>
            {score} <Logo />
          </Typography.Title>
        );
      },
    },
  ];

  return (
    <TableWrapper>
      <Table
        rowKey={(record) => record.actor.userkey}
        columns={columns}
        dataSource={combined}
        loading={isLoadingRecentProfiles}
        pagination={false}
        scroll={{ x: 'max-content' }}
      />
    </TableWrapper>
  );
}
