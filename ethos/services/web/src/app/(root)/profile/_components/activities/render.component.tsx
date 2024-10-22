import {
  attestationActivity,
  reviewActivity,
  unvouchActivity,
  vouchActivity,
  type ActivityInfo,
} from '@ethos/domain';
import { useMemo } from 'react';
import { splitInTwo } from './helper';
import { TwoColumns } from './two-columns.component';
import { AttestationCard } from 'components/activity-cards/attestation.card.component';
import { ReviewCard } from 'components/activity-cards/review-card.component';
import { VouchCard } from 'components/activity-cards/vouch-card.component';
import { type BulkVotes } from 'types/activity';

type Props = {
  activities: ActivityInfo[];
  userVotes?: BulkVotes;
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

export function RenderActivities({ activities, userVotes }: Props) {
  const { columnOne: columnOneData, columnTwo: columnTwoData } =
    splitInTwo<ActivityInfo>(activities);

  const columnOne = useMemo(() => renderData(columnOneData, userVotes), [columnOneData, userVotes]);

  const columnTwo = useMemo(() => renderData(columnTwoData, userVotes), [columnTwoData, userVotes]);
  const full = useMemo(() => renderData(activities, userVotes), [activities, userVotes]);

  return <TwoColumns columnOne={columnOne} columnTwo={columnTwo} full={full} />;
}
