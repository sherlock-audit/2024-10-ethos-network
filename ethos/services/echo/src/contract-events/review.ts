import { Score, type Review } from '@ethos/blockchain-manager';
import { type ReviewTypes } from '@ethos/contracts';
import { BASE_REVIEW_XP_GAIN, type EthosUserTarget, reviewActivity } from '@ethos/domain';
import { getDateFromUnix, isValidAddress } from '@ethos/helpers';
import { type Prisma, ReviewEventType, XpPointsHistoryItemType } from '@prisma-pg/client';
import { getAddress } from 'viem';
import { blockchainManager } from '../common/blockchain-manager.js';
import { prisma } from '../data/db.js';
import { getTargetScoreXpMultiplier } from '../data/score/xp.js';
import { type EventProcessor, type WrangledEvent } from './event-processing.js';
import { sendReviewNotificationToUsers } from './user-notifications.js';

type ReviewId = number;

type Payload = {
  reviewCreates: Prisma.ReviewCreateManyInput[];
  xpPointsCreates: Prisma.XpPointsHistoryCreateManyInput[];
  reviewUpdates: Prisma.ReviewUpdateManyArgs[];
  reviewEventCreates: Prisma.ReviewEventUncheckedCreateInput[];
};

type EventUnion =
  | WrangledEvent<'ReviewCreated', ReviewTypes.ReviewCreatedEvent.LogDescription>
  | WrangledEvent<'ReviewArchived', ReviewTypes.ReviewArchivedEvent.LogDescription>
  | WrangledEvent<'ReviewRestored', ReviewTypes.ReviewRestoredEvent.LogDescription>
  | WrangledEvent<'ReviewEdited', ReviewTypes.ReviewEditedEvent.LogDescription>;

export const reviewEventProcessor: EventProcessor<EventUnion, Payload> = {
  ignoreEvents: new Set([]),
  getLogs: async (...args) => await blockchainManager.getReviewEvents(...args),
  parseLog: (log) => blockchainManager.ethosReview.contract.interface.parseLog(log),
  eventWrangler: (parsed) => {
    switch (parsed.name) {
      case 'ReviewCreated': {
        return {
          ...(parsed as unknown as ReviewTypes.ReviewCreatedEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'ReviewArchived': {
        return {
          ...(parsed as unknown as ReviewTypes.ReviewArchivedEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'ReviewRestored': {
        return {
          ...(parsed as unknown as ReviewTypes.ReviewRestoredEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'ReviewEdited': {
        return {
          ...(parsed as unknown as ReviewTypes.ReviewEditedEvent.LogDescription),
          name: parsed.name,
        };
      }
    }

    return null;
  },
  preparePayload: async (events, logger) => {
    const xpPointsCreates = new Set<Prisma.XpPointsHistoryCreateManyInput>();
    const reviewCreates = new Map<ReviewId, Prisma.ReviewCreateManyInput>();
    const reviewUpdates: Prisma.ReviewUpdateManyArgs[] = [];
    const eventReviewCreates: Prisma.ReviewEventUncheckedCreateInput[] = [];
    const dirtyScoreTargets: EthosUserTarget[] = [];

    for (const event of events) {
      const { args } = event.wrangled;
      const reviewId: ReviewId = Number(args.reviewId);

      eventReviewCreates.push({
        eventId: event.id,
        reviewId,
        type: eventTypeByEventName.get(event.wrangled.name),
      });

      const review = await blockchainManager.ethosReview.getReview(reviewId);

      if (!review) {
        logger.warn({ data: { reviewId } }, 'review_not_found');
        continue;
      }
      const authorProfileId = Number(
        await blockchainManager.ethosProfile.contract.profileIdByAddress(review?.author),
      );

      dirtyScoreTargets.push(toTarget(review));
      const pointsMultiplier = await getTargetScoreXpMultiplier({
        profileId: authorProfileId,
      });

      switch (event.wrangled.name) {
        case 'ReviewCreated':
          reviewCreates.set(reviewId, {
            id: reviewId,
            createdAt: getDateFromUnix(review.createdAt),
            archived: review.archived,
            score: Score[review.score],
            author: review.author,
            authorProfileId,
            subject: review.subject,
            comment: review.comment,
            metadata: review.metadata,
            account: review.attestationDetails?.account ?? '',
            service: review.attestationDetails?.service ?? '',
          });

          xpPointsCreates.add({
            createdAt: getDateFromUnix(review.createdAt),
            points: BASE_REVIEW_XP_GAIN * pointsMultiplier,
            profileId: authorProfileId,
            type: XpPointsHistoryItemType.REVIEW,
            metadata: { id: reviewId, type: reviewActivity, multiplier: pointsMultiplier },
          });
          break;
        case 'ReviewArchived':
          reviewUpdates.push({
            data: { archived: true },
            where: { id: reviewId },
          });

          break;
        case 'ReviewRestored':
          reviewUpdates.push({
            data: { archived: false },
            where: { id: reviewId },
          });

          break;
        case 'ReviewEdited':
          reviewUpdates.push({
            data: { comment: review.comment, metadata: review.metadata },
            where: { id: reviewId },
          });

          break;
      }
    }

    return {
      payload: {
        reviewCreates: Array.from(reviewCreates.values()),
        xpPointsCreates: Array.from(xpPointsCreates.values()),
        reviewUpdates: Array.from(reviewUpdates.values()),
        reviewEventCreates: Array.from(eventReviewCreates.values()),
      },
      dirtyScoreTargets,
    };
  },
  submitPayload: async ({ reviewCreates, reviewUpdates, reviewEventCreates, xpPointsCreates }) => {
    await prisma.$transaction([
      prisma.review.createMany({ data: reviewCreates }),
      prisma.xpPointsHistory.createMany({ data: xpPointsCreates }),
      // eslint-disable-next-line @typescript-eslint/promise-function-async
      ...reviewUpdates.map((x) => prisma.review.updateMany(x)),
      prisma.reviewEvent.createMany({ data: reviewEventCreates }),
    ]);

    await sendReviewNotificationToUsers(reviewCreates);
  },
};

// convert review fields to ethos user target
function toTarget(review: Review): EthosUserTarget {
  if (isValidAddress(review.subject)) return { address: getAddress(review.subject) };
  else if (review.attestationDetails)
    return {
      service: review.attestationDetails.service,
      account: review.attestationDetails.account,
    };

  throw new Error('invalid review subject');
}

const eventTypeByEventName = new Map<string, ReviewEventType>([
  ['ReviewCreated', ReviewEventType.CREATE],
  ['ReviewArchived', ReviewEventType.ARCHIVE],
  ['ReviewRestored', ReviewEventType.RESTORE],
]);
