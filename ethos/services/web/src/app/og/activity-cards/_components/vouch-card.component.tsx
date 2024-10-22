import { type VouchActivityInfo } from '@ethos/domain';
import { formatEth } from '@ethos/helpers';
import { ActivityCard } from './activity-card.component';
import { getAvatar } from 'app/og/utils/avatar';
import { VouchFilledSvg } from 'components/icons/vouch-filled.svg';
import { lightTheme } from 'config';
import { parseVouchMetadata } from 'hooks/api/blockchain-manager/metadata.utils';

type VouchCardProps = {
  vouch: VouchActivityInfo;
};

export function VouchCard({ vouch }: VouchCardProps) {
  const { description } = parseVouchMetadata(vouch.data.metadata);

  return (
    <ActivityCard
      activityTypeIcon={
        <span style={{ display: 'flex', color: lightTheme.token.colorPrimary }}>
          <VouchFilledSvg />
        </span>
      }
      authorName={vouch.author.name}
      authorAvatar={getAvatar(vouch.author.avatar, vouch.author.primaryAddress)}
      authorScore={vouch.author.score}
      subjectName={vouch.subject.name}
      subjectAvatar={getAvatar(vouch.subject.avatar, vouch.subject.primaryAddress)}
      action={vouch.data.archived ? 'unvouched' : 'vouched for'}
      timestamp={vouch.timestamp}
      title={`“${vouch.data.comment}”`}
      description={description}
      statusBadge={
        <span
          style={{
            display: 'flex',
            color: lightTheme.token.colorPrimary,
            fontFamily: 'Queens',
            fontWeight: 600,
            lineHeight: '24px',
            paddingBottom: '6px',
            ...(vouch.data.archived && { textDecoration: 'line-through' }),
          }}
        >
          {formatEth(vouch.data.balance)}
        </span>
      }
      replies={vouch.replySummary.count}
      votes={vouch.votes.upvotes - vouch.votes.downvotes}
    />
  );
}
