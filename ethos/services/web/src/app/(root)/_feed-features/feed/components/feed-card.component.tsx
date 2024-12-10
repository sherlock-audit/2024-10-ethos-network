import {
  type ActivityInfo,
  attestationActivity,
  invitationAcceptedActivity,
  reviewActivity,
  unvouchActivity,
  vouchActivity,
} from '@ethos/domain';
import { useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { AttestationCard } from 'components/activity-cards/attestation.card.component';
import { InvitationAcceptedCard } from 'components/activity-cards/invitation-accepted.component';
import { ReviewCard } from 'components/activity-cards/review-card.component';
import { VouchCard } from 'components/activity-cards/vouch-card.component';
import { SkeletonCard } from 'components/loading-wrapper/components/skeleton-card.component';

type Props = {
  item: ActivityInfo;
  userVotes: any;
};

export function FeedCard({ item, userVotes }: Props) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '400px',
    threshold: 0,
  });

  if (inView && !hasLoaded) {
    setHasLoaded(true);
  }

  // if the element not in the view
  if (!hasLoaded) {
    return (
      <div ref={ref}>
        <SkeletonCard />
      </div>
    );
  }

  if (item.type === attestationActivity) {
    return <AttestationCard info={item} userVotes={userVotes} />;
  }

  if (item.type === reviewActivity) {
    return <ReviewCard info={item} userVotes={userVotes} />;
  }

  if (item.type === vouchActivity || item.type === unvouchActivity) {
    return <VouchCard info={item} userVotes={userVotes} />;
  }

  if (item.type === invitationAcceptedActivity) {
    return <InvitationAcceptedCard info={item} />;
  }

  return null;
}
