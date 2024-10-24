import {
  type Relationship,
  type ActivityActor,
  type ActivityInfo,
  toUserKey,
  type LiteProfile,
} from '@ethos/domain';
import { useState } from 'react';
import { type Address } from 'viem';
import { useRecentInteractions } from 'hooks/api/echo.hooks';
import { placeholderActor, useActivities, useActivityActorsBulk } from 'hooks/user/activities';

// todo make infinite scroll?
const PAGE_SIZE = 50;

// convenience type for the table data
type RelationshipActorActivities = {
  relationship: Relationship;
  actor: ActivityActor;
  activities: ActivityInfo[];
};

/**
 * Hook to fetch and process ethos activities and relationships for existing ethereum interactions.
 *
 * @param address - The address to fetch interactions for
 * @param currentProfile - The current user's profile
 * @param currentPage - The current page number for pagination
 * @returns An object containing:
 *   - relationshipActorActivities: Array of processed relationship data
 *   - isPending: Boolean indicating if any data is still loading
 */
function useRelationshipData(
  address: Address | undefined | null,
  currentProfile: LiteProfile | null | undefined,
  currentPage: number,
): {
  relationshipActorActivities: RelationshipActorActivities[];
  isPending: boolean;
} {
  // get paginated list of recent interactions
  const { data: recentInteractions, isPending: isPendingInteractions } = useRecentInteractions(
    address,
    PAGE_SIZE,
    (currentPage - 1) * PAGE_SIZE,
  );

  const relationships = recentInteractions?.values ?? [];
  const activityIds = {
    review: relationships.flatMap((r) => r.reviews.map((review) => review.id) ?? []),
    vouch: relationships.flatMap((r) => r.vouch?.id ?? []),
  };

  // get the activities related to these interactions
  const { data: relationshipActivities, isPending: isPendingRelationshipActivities } =
    useActivities({
      currentUserProfileId: currentProfile?.id ?? null,
      review: activityIds.review,
      vouch: activityIds.vouch,
    });

  // look up all the associated actors
  const { data: relationshipActors, isPending: isPendingRelationshipActors } =
    useActivityActorsBulk(relationships.map((relationship) => ({ address: relationship.address })));

  // build the data structure for the table
  const relationshipActorActivities = relationships.map((relationship, index) => {
    const actor =
      relationshipActors?.[index] ?? placeholderActor({ address: relationship.address });
    const activities =
      relationshipActivities?.filter(
        (activity) => activity.subject.userkey === toUserKey({ address: relationship.address }),
      ) ?? [];

    return {
      relationship,
      actor,
      activities,
    };
  });

  return {
    relationshipActorActivities,
    isPending:
      isPendingInteractions || isPendingRelationshipActivities || isPendingRelationshipActors,
  };
}

function useReviewModal() {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [currentReviewTarget, setCurrentReviewTarget] = useState<{ address: Address } | null>(null);

  const showReviewModal = (address: Address) => {
    setCurrentReviewTarget({ address });
    setIsReviewModalOpen(true);
  };

  const hideReviewModal = () => {
    setIsReviewModalOpen(false);
    setCurrentReviewTarget(null);
  };

  return { isReviewModalOpen, currentReviewTarget, showReviewModal, hideReviewModal };
}

export const interactionUtils = {
  useRelationshipData,
  useReviewModal,
  PAGE_SIZE,
};
