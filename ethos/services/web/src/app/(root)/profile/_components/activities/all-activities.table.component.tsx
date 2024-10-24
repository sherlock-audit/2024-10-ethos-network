import {
  type ActivityInfo,
  attestationActivity,
  type EthosUserTarget,
  fromUserKey,
  toUserKey,
} from '@ethos/domain';
import { Flex, theme } from 'antd';
import Link from 'next/link';
import { ActivityListItem } from './activity-list-item.component';
import { ViewTxn } from 'app/(root)/activity/_components/view.txn.component';
import { RelativeDateTime } from 'components/RelativeDateTime';
import { ActivityTypeIcon } from 'components/activity-cards/card-header-title.component';
import { LoadingWrapper } from 'components/loading-wrapper/loading-wrapper.component';
import { PersonWithAvatar } from 'components/person-with-avatar/person-with-avatar.component';
import { InfiniteTable } from 'components/table/InfiniteTable';
import { tokenCssVars } from 'config';
import { DEFAULT_PAGE_SIZE } from 'constant/constants';
import { useInfiniteRecentActivities } from 'hooks/user/activities';
import { getServiceAccountUrl } from 'utils/routing';
import { getVouchTxnUrl } from 'utils/vouch';

type Props = {
  target: EthosUserTarget;
};

export function AllActivitiesTable({ target }: Props) {
  const { token } = theme.useToken();
  const { data, isLoading, fetchNextPage, isFetching } = useInfiniteRecentActivities({
    pagination: {
      limit: DEFAULT_PAGE_SIZE,
      offset: 0,
    },
    target: toUserKey(target),
  });
  const values = data?.values;

  const columns = [
    {
      title: 'Activity',
      key: 'activity',
      render: (activity: ActivityInfo) => {
        return <ActivityListItem activity={activity} />;
      },
      onHeaderCell: () => ({
        style: {
          paddingLeft: `${token.padding}px`,
          height: '54px',
        },
      }),
      onCell: () => ({
        style: {
          paddingLeft: `${token.padding}px`,
        },
      }),
    },
    {
      title: 'Date',
      key: 'date',
      render: (activity: ActivityInfo) => {
        const txnHash = getVouchTxnUrl(
          activity.data.archived && activity.type === 'unvouch',
          activity.events,
        );

        return (
          <Flex align="center" gap={4}>
            <RelativeDateTime timestamp={activity.timestamp} verbose />
            {txnHash && <ViewTxn txnHash={txnHash} />}
          </Flex>
        );
      },
    },
    {
      title: 'Actor',
      key: 'actor',
      render: (activity: ActivityInfo) => (
        <PersonWithAvatar
          target={fromUserKey(activity.author.userkey)}
          avatarSize="small"
          nameSize="large"
        />
      ),
    },
    {
      title: 'Subject',
      key: 'subject',
      render: (activity: ActivityInfo) => {
        if (activity.type === attestationActivity) {
          const { username } = activity.data;

          return (
            <Flex align="center" gap="8px">
              <ActivityTypeIcon
                type={activity.type}
                service={activity.data.service}
                color={tokenCssVars.colorPrimaryText}
              />
              <Link
                target="_blank"
                href={getServiceAccountUrl({ service: activity.data.service, account: username })}
                css={{ color: tokenCssVars.colorPrimary }}
              >
                <span>@{username}</span>
              </Link>
            </Flex>
          );
        }

        return (
          <PersonWithAvatar
            target={fromUserKey(activity.subject.userkey)}
            avatarSize="small"
            nameSize="large"
          />
        );
      },
    },
  ];
  const isFetchingNewData = !isLoading && isFetching;

  return (
    <LoadingWrapper type="skeletonTable" isLoading={isLoading} isEmpty={!values?.length}>
      <InfiniteTable
        columns={columns}
        isLoading={isLoading}
        isFetchingNewData={isFetchingNewData}
        fetchNextPage={fetchNextPage}
        rowKey={(row) => `${row.type}-${row.data.id}`}
        dataSource={values}
      />
    </LoadingWrapper>
  );
}
