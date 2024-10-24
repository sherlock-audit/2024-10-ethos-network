import { reviewActivity, toUserKey, vouchActivity, type EthosUserTarget } from '@ethos/domain';
import { Tabs, type TabsProps } from 'antd';
import { AllActivitiesTable } from './all-activities.table.component';
import { containsUserKey } from './helper';
import { RenderActivities } from './render.component';
import { LoadingWrapper } from 'components/loading-wrapper/loading-wrapper.component';
import { useQueryAwaitDataUpdate } from 'hooks/useWaitForQueryDataUpdate';
import { useActivityVotes, useRecentActivities, voteLookup } from 'hooks/user/activities';
import { useAttestations, useProfileAddresses } from 'hooks/user/lookup';

type Props = {
  target: EthosUserTarget;
};

// target may be a profileId, address, or service; we need to check for actors in all cases
// TODO remove this once we use profileId for identifying users
function useValidTargets(target: EthosUserTarget) {
  const validTargets: string[] = [toUserKey(target)];
  const profileAddresses = useProfileAddresses(target).data;
  const attestations = useAttestations(target).data;

  if (profileAddresses?.profileId) {
    validTargets.push(toUserKey({ profileId: profileAddresses.profileId }));
    profileAddresses.allAddresses.forEach((address) => {
      validTargets.push(toUserKey({ address }));
    });
  }

  if (attestations) {
    attestations.forEach((attestation) => {
      validTargets.push(toUserKey({ service: attestation.service, account: attestation.account }));
    });
  }

  return validTargets;
}

export function Activities({ target }: Props) {
  const queryResult = useRecentActivities(
    target,
    {
      pagination: {
        current: 1,
        pageSize: 50,
      },
    },
    [reviewActivity, vouchActivity],
  );

  const { data, isPending, isPolling, isFetching } = useQueryAwaitDataUpdate(
    queryResult,
    (data) => data.values?.[0]?.timestamp ?? 0,
    ['REVIEW_ADDED'],
  );

  const allRecentActivities = data?.values ?? [];

  const userVotes = useActivityVotes(voteLookup(allRecentActivities)).data;

  const validTargets = useValidTargets(target);

  const activityBreakdown = {
    author: allRecentActivities.filter((info) => {
      if (info.type === vouchActivity) {
        return containsUserKey(validTargets, info.author.userkey) && !info.data.archived;
      }

      return containsUserKey(validTargets, info.author.userkey) && !info.data.archived;
    }),
    subject: allRecentActivities.filter((info) => {
      if (info.type === vouchActivity) {
        return containsUserKey(validTargets, info.subject.userkey) && !info.data.archived;
      }

      return containsUserKey(validTargets, info.subject.userkey) && !info.data.archived;
    }),
  };

  const isInProgress = isPending || isPolling || isFetching;

  const items: TabsProps['items'] = [
    {
      key: 'received',
      label: 'Received',
      children: (
        <LoadingWrapper
          type="skeletonCardTwoColumnList"
          isLoading={isInProgress}
          isEmpty={!activityBreakdown.subject.length}
          emptyDescription="No activity yet"
        >
          <RenderActivities activities={activityBreakdown.subject} userVotes={userVotes} />
        </LoadingWrapper>
      ),
    },
    {
      key: 'given',
      label: 'Given',
      children: (
        <LoadingWrapper
          type="skeletonCardTwoColumnList"
          isLoading={isInProgress}
          isEmpty={!activityBreakdown.author.length}
          emptyDescription="No activity yet"
        >
          <RenderActivities activities={activityBreakdown.author} userVotes={userVotes} />
        </LoadingWrapper>
      ),
    },
    {
      key: 'all-activities',
      label: 'All activity',
      children: <AllActivitiesTable target={target} />,
    },
  ];

  return <Tabs defaultActiveKey={items[0].key} items={items} />;
}
