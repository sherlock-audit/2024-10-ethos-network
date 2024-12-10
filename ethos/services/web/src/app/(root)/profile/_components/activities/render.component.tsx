import {
  attestationActivity,
  type EthosUserTarget,
  reviewActivity,
  unvouchActivity,
  vouchActivity,
  type ActivityInfo,
  toUserKey,
} from '@ethos/domain';
import { type UnifiedActivityRequest } from '@ethos/echo-client';
import { useMemo } from 'react';
import { splitInTwo } from './helper';
import { TwoColumns } from './two-columns.component';
import { AttestationCard } from 'components/activity-cards/attestation.card.component';
import { ReviewCard } from 'components/activity-cards/review-card.component';
import { VouchCard } from 'components/activity-cards/vouch-card.component';
import { LoadingWrapper } from 'components/loading-wrapper/loading-wrapper.component';
import { DEFAULT_PAGE_SIZE } from 'constant/constants';
import { useActivityVotes, useInfiniteRecentActivities, voteLookup } from 'hooks/user/activities';
import { type BulkVotes } from 'types/activity';

type Props = {
  target: EthosUserTarget;
  direction: UnifiedActivityRequest['direction'];
  filter: UnifiedActivityRequest['filter'];
};

function renderData(data: ActivityInfo[], userVotes?: BulkVotes) {
  return data.map((item) => {
    if (item.type === attestationActivity) {
      return (
        <AttestationCard
          key={`${item.data.service}-${item.data.account}`}
          info={item}
          userVotes={userVotes}
        />
      );
    }

    if (item.type === reviewActivity) {
      return <ReviewCard key={`review-${item.data.id}`} info={item} userVotes={userVotes} />;
    }

    if (item.type === vouchActivity || item.type === unvouchActivity) {
      return <VouchCard key={`vouch-${item.data.id}`} info={item} userVotes={userVotes} />;
    }

    return null;
  });
}

export function RenderActivities({ target, direction, filter }: Props) {
  const { data, isPending, isFetching } = useInfiniteRecentActivities({
    target: toUserKey(target),
    direction,
    filter,
    excludeHistorical: true,
    pagination: {
      limit: DEFAULT_PAGE_SIZE,
    },
  });

  const activities = useMemo(() => data?.values ?? [], [data]);
  const userVotes = useActivityVotes(voteLookup(activities)).data;

  const { columnOne: columnOneData, columnTwo: columnTwoData } =
    splitInTwo<ActivityInfo>(activities);

  const columnOne = useMemo(() => renderData(columnOneData, userVotes), [columnOneData, userVotes]);

  const columnTwo = useMemo(() => renderData(columnTwoData, userVotes), [columnTwoData, userVotes]);
  const full = useMemo(() => renderData(activities, userVotes), [activities, userVotes]);

  const isInProgress = isPending || isFetching;

  return (
    <LoadingWrapper
      type="skeletonCardTwoColumnList"
      isLoading={isInProgress}
      isEmpty={!activities.length}
      emptyDescription="No activity yet"
    >
      <TwoColumns columnOne={columnOne} columnTwo={columnTwo} full={full} />
    </LoadingWrapper>
  );
}
