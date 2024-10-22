/* eslint-disable @typescript-eslint/promise-function-async */
import {
  type AttestationTypes,
  type DiscussionTypes,
  type VoteTypes,
  type VouchTypes,
  type ReviewTypes,
  type ProfileTypes,
} from '@ethos/contracts';
import {
  AttestationEventType,
  ProfileEventType,
  ReplyEventType,
  ReviewEventType,
  VoteEventType,
  VouchEventType,
  type Prisma,
} from '@prisma/client';
import { type JsonValue } from '@prisma/client/runtime/library';
import { type LogDescription, type Log } from 'ethers';
import { blockchainManager } from '../common/blockchain-manager';
import { prisma } from '../data/db';
import { type WrangledEvent } from './event-processing';

type Payload = {
  attestationEventUpdates: Prisma.AttestationEventUpdateManyArgs[];
  profileEventUpdates: Prisma.ProfileEventUpdateManyArgs[];
  replyEventUpdates: Prisma.ReplyEventUpdateManyArgs[];
  reviewEventUpdates: Prisma.ReviewEventUpdateManyArgs[];
  voteEventUpdates: Prisma.VoteEventUpdateManyArgs[];
  vouchEventUpdates: Prisma.VouchEventUpdateManyArgs[];
};

type EventUnion =
  | WrangledEvent<'AttestationCreated', AttestationTypes.AttestationCreatedEvent.LogDescription>
  | WrangledEvent<'AttestationArchived', AttestationTypes.AttestationArchivedEvent.LogDescription>
  | WrangledEvent<'AttestationClaimed', AttestationTypes.AttestationClaimedEvent.LogDescription>
  | WrangledEvent<'AttestationRestored', AttestationTypes.AttestationRestoredEvent.LogDescription>
  | WrangledEvent<'ProfileCreated', ProfileTypes.ProfileCreatedEvent.LogDescription>
  | WrangledEvent<'ProfileArchived', ProfileTypes.ProfileArchivedEvent.LogDescription>
  | WrangledEvent<'ProfileRestored', ProfileTypes.ProfileRestoredEvent.LogDescription>
  | WrangledEvent<'UserInvited', ProfileTypes.UserInvitedEvent.LogDescription>
  | WrangledEvent<'Uninvited', ProfileTypes.UninvitedEvent.LogDescription>
  | WrangledEvent<'ReplyAdded', DiscussionTypes.ReplyAddedEvent.LogDescription>
  | WrangledEvent<'ReplyEdited', DiscussionTypes.ReplyEditedEvent.LogDescription>
  | WrangledEvent<'ReviewCreated', ReviewTypes.ReviewCreatedEvent.LogDescription>
  | WrangledEvent<'ReviewArchived', ReviewTypes.ReviewArchivedEvent.LogDescription>
  | WrangledEvent<'ReviewRestored', ReviewTypes.ReviewRestoredEvent.LogDescription>
  | WrangledEvent<'Voted', VoteTypes.VotedEvent.LogDescription>
  | WrangledEvent<'VoteChanged', VoteTypes.VoteChangedEvent.LogDescription>
  | WrangledEvent<'Vouched', VouchTypes.VouchedEvent.LogDescription>
  | WrangledEvent<'Unvouched', VouchTypes.UnvouchedEvent.LogDescription>
  | WrangledEvent<'MarkedUnhealthy', VouchTypes.MarkedUnhealthyEvent.LogDescription>;

export async function run(): Promise<void> {
  const logs = await getLogs();

  const events = logs
    .map((log) => {
      const description = parseLog(log.event, log.log);

      if (description !== null) {
        const wrangled = decode(description);

        return wrangled ? { id: log.eventId, wrangled } : null;
      }

      return null;
    })
    .filter((e) => e !== null);

  const {
    attestationEventUpdates,
    profileEventUpdates,
    replyEventUpdates,
    reviewEventUpdates,
    voteEventUpdates,
    vouchEventUpdates,
  } = await preparePayload(events);

  await prisma.$transaction([
    ...attestationEventUpdates.map((x) => prisma.attestationEvent.updateMany(x)),
    ...profileEventUpdates.map((x) => prisma.profileEvent.updateMany(x)),
    ...replyEventUpdates.map((x) => prisma.replyEvent.updateMany(x)),
    ...reviewEventUpdates.map((x) => prisma.reviewEvent.updateMany(x)),
    ...voteEventUpdates.map((x) => prisma.voteEvent.updateMany(x)),
    ...vouchEventUpdates.map((x) => prisma.vouchEvent.updateMany(x)),
  ]);
}

async function getLogs(): Promise<Array<{ eventId: number; event: string; log: Log }>> {
  const logs = await prisma.$queryRaw<Array<{ id: number; event: string; logData: JsonValue }>>`
      SELECT ae."eventId" id, 'attestation' event, be."logData"
      FROM attestation_events ae
      JOIN public.blockchain_events be ON ae."eventId" = be.id
      WHERE ae."type" IS NULL
      UNION ALL
      SELECT pe."eventId" id, 'profile' event, be."logData"
      FROM profile_events pe
      JOIN public.blockchain_events be ON pe."eventId" = be.id
      WHERE pe."type" IS NULL
      UNION ALL
      SELECT re."eventId" id, 'reply' event, be."logData"
      FROM reply_events re
      JOIN public.blockchain_events be ON re."eventId" = be.id
      WHERE re."type" IS NULL
      UNION ALL
      SELECT re."eventId" id, 'review' event, be."logData"
      FROM review_events re
      JOIN public.blockchain_events be ON re."eventId" = be.id
      WHERE re."type" IS NULL
      UNION ALL
      SELECT ve."eventId" id, 'vote' event, be."logData"
      FROM vote_events ve
      JOIN public.blockchain_events be ON ve."eventId" = be.id
      WHERE ve."type" IS NULL
      UNION ALL
      SELECT ve."eventId" id, 'vouch' event, be."logData"
      FROM vouch_events ve
      JOIN public.blockchain_events be ON ve."eventId" = be.id
      WHERE ve."type" IS NULL`;

  return logs.map((log) => ({
    eventId: log.id,
    event: log.event,
    log: log.logData as unknown as Log,
  }));
}

function parseLog(event: string, log: Log): LogDescription | null {
  switch (event) {
    case 'attestation':
      return blockchainManager.ethosAttestation.contract.interface.parseLog(log);
    case 'profile':
      return blockchainManager.ethosProfile.contract.interface.parseLog(log);
    case 'reply':
      return blockchainManager.ethosDiscussion.contract.interface.parseLog(log);
    case 'review':
      return blockchainManager.ethosReview.contract.interface.parseLog(log);
    case 'vote':
      return blockchainManager.ethosVote.contract.interface.parseLog(log);
    case 'vouch':
      return blockchainManager.ethosVouch.contract.interface.parseLog(log);
    default:
      return null;
  }
}

function decode(description: LogDescription): EventUnion | null {
  switch (description.name) {
    case 'AttestationClaimed': {
      return {
        ...(description as unknown as AttestationTypes.AttestationClaimedEvent.LogDescription),
        name: description.name,
      };
    }
    case 'AttestationCreated': {
      return {
        ...(description as unknown as AttestationTypes.AttestationCreatedEvent.LogDescription),
        name: description.name,
      };
    }
    case 'AttestationArchived': {
      return {
        ...(description as unknown as AttestationTypes.AttestationArchivedEvent.LogDescription),
        name: description.name,
      };
    }
    case 'AttestationRestored': {
      return {
        ...(description as unknown as AttestationTypes.AttestationRestoredEvent.LogDescription),
        name: description.name,
      };
    }
    case 'ProfileCreated': {
      return {
        ...(description as unknown as ProfileTypes.ProfileCreatedEvent.LogDescription),
        name: description.name,
      };
    }
    case 'ProfileArchived': {
      return {
        ...(description as unknown as ProfileTypes.ProfileArchivedEvent.LogDescription),
        name: description.name,
      };
    }
    case 'ProfileRestored': {
      return {
        ...(description as unknown as ProfileTypes.ProfileRestoredEvent.LogDescription),
        name: description.name,
      };
    }
    case 'UserInvited': {
      return {
        ...(description as unknown as ProfileTypes.UserInvitedEvent.LogDescription),
        name: description.name,
      };
    }
    case 'Uninvited': {
      return {
        ...(description as unknown as ProfileTypes.UninvitedEvent.LogDescription),
        name: description.name,
      };
    }
    case 'ReplyAdded': {
      return {
        ...(description as unknown as DiscussionTypes.ReplyAddedEvent.LogDescription),
        name: description.name,
      };
    }
    case 'ReplyEdited': {
      return {
        ...(description as unknown as DiscussionTypes.ReplyEditedEvent.LogDescription),
        name: description.name,
      };
    }
    case 'ReviewCreated': {
      return {
        ...(description as unknown as ReviewTypes.ReviewCreatedEvent.LogDescription),
        name: description.name,
      };
    }
    case 'ReviewArchived': {
      return {
        ...(description as unknown as ReviewTypes.ReviewArchivedEvent.LogDescription),
        name: description.name,
      };
    }
    case 'ReviewRestored': {
      return {
        ...(description as unknown as ReviewTypes.ReviewRestoredEvent.LogDescription),
        name: description.name,
      };
    }
    case 'Voted': {
      return {
        ...(description as unknown as VoteTypes.VotedEvent.LogDescription),
        name: description.name,
      };
    }
    case 'VoteChanged': {
      return {
        ...(description as unknown as VoteTypes.VoteChangedEvent.LogDescription),
        name: description.name,
      };
    }
    case 'Vouched': {
      return {
        ...(description as unknown as VouchTypes.VouchedEvent.LogDescription),
        name: description.name,
      };
    }
    case 'Unvouched': {
      return {
        ...(description as unknown as VouchTypes.UnvouchedEvent.LogDescription),
        name: description.name,
      };
    }
    case 'MarkedUnhealthy': {
      return {
        ...(description as unknown as VouchTypes.MarkedUnhealthyEvent.LogDescription),
        name: description.name,
      };
    }
  }

  return null;
}

async function preparePayload(
  events: Array<{ id: number; wrangled: EventUnion }>,
): Promise<Payload> {
  const attestationEvents: Prisma.AttestationEventUpdateManyArgs[] = [];
  const profileEvents: Prisma.ProfileEventUpdateManyArgs[] = [];
  const replyEvents: Prisma.ReplyEventUpdateManyArgs[] = [];
  const reviewEvents: Prisma.ReviewEventUpdateManyArgs[] = [];
  const voteEvents: Prisma.VoteEventUpdateManyArgs[] = [];
  const vouchEvents: Prisma.VouchEventUpdateManyArgs[] = [];

  for (const event of events) {
    if (event.wrangled.name === 'AttestationCreated') {
      attestationEvents.push({
        data: { type: AttestationEventType.CREATE },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'AttestationClaimed') {
      attestationEvents.push({
        data: { type: AttestationEventType.CLAIM },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'AttestationArchived') {
      attestationEvents.push({
        data: { type: AttestationEventType.ARCHIVE },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'AttestationRestored') {
      attestationEvents.push({
        data: { type: AttestationEventType.RESTORE },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'ProfileCreated') {
      profileEvents.push({
        data: { type: ProfileEventType.CREATE },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'ProfileArchived') {
      profileEvents.push({
        data: { type: ProfileEventType.ARCHIVE },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'ProfileRestored') {
      profileEvents.push({
        data: { type: ProfileEventType.RESTORE },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'UserInvited') {
      profileEvents.push({
        data: { type: ProfileEventType.INVITE },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'Uninvited') {
      profileEvents.push({
        data: { type: ProfileEventType.UNINVITE },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'ReplyAdded') {
      replyEvents.push({
        data: { type: ReplyEventType.CREATE },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'ReplyEdited') {
      replyEvents.push({
        data: { type: ReplyEventType.EDIT },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'ReviewCreated') {
      reviewEvents.push({
        data: { type: ReviewEventType.CREATE },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'ReviewArchived') {
      reviewEvents.push({
        data: { type: ReviewEventType.ARCHIVE },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'ReviewRestored') {
      reviewEvents.push({
        data: { type: ReviewEventType.RESTORE },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'Voted') {
      voteEvents.push({
        data: { type: VoteEventType.CREATE },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'VoteChanged') {
      voteEvents.push({
        data: { type: VoteEventType.UPDATE },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'Vouched') {
      vouchEvents.push({
        data: { type: VouchEventType.CREATE },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'Unvouched') {
      vouchEvents.push({
        data: { type: VouchEventType.UNVOUCH },
        where: { eventId: event.id },
      });
    } else if (event.wrangled.name === 'MarkedUnhealthy') {
      vouchEvents.push({
        data: { type: VouchEventType.UNHEALTHY },
        where: { eventId: event.id },
      });
    }
  }

  return {
    attestationEventUpdates: Array.from(attestationEvents.values()),
    profileEventUpdates: Array.from(profileEvents.values()),
    replyEventUpdates: Array.from(replyEvents.values()),
    reviewEventUpdates: Array.from(reviewEvents.values()),
    voteEventUpdates: Array.from(voteEvents.values()),
    vouchEventUpdates: Array.from(vouchEvents.values()),
  };
}
