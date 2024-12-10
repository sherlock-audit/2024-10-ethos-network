import { type DiscussionTypes } from '@ethos/contracts';
import { getDateFromUnix } from '@ethos/helpers';
import { ReplyEventType, type Prisma } from '@prisma-pg/client';
import { getAddress } from 'viem';
import { blockchainManager } from '../common/blockchain-manager.js';
import { prisma } from '../data/db.js';
import { type EventProcessor, type WrangledEvent } from './event-processing.js';
import { sendReplyNotificationToUsers } from './user-notifications.js';
import { toPrismaContract } from './index.js';

type Payload = {
  replyCreates: Prisma.ReplyCreateManyInput[];
  replyUpdates: Prisma.ReplyUpdateManyArgs[];
  replyEventCreates: Prisma.ReplyEventUncheckedCreateInput[];
};

type EventUnion =
  | WrangledEvent<'ReplyAdded', DiscussionTypes.ReplyAddedEvent.LogDescription>
  | WrangledEvent<'ReplyEdited', DiscussionTypes.ReplyEditedEvent.LogDescription>;

export const discussionEventProcessor: EventProcessor<EventUnion, Payload> = {
  ignoreEvents: new Set(['Initialized', 'OwnershipTransferred', 'Upgraded']),
  getLogs: async (...args) => await blockchainManager.getDiscussionEvents(...args),
  parseLog: (log) => blockchainManager.ethosDiscussion.contract.interface.parseLog(log),
  eventWrangler: (parsed) => {
    switch (parsed.name) {
      case 'ReplyAdded': {
        return {
          ...(parsed as unknown as DiscussionTypes.ReplyAddedEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'ReplyEdited': {
        return {
          ...(parsed as unknown as DiscussionTypes.ReplyEditedEvent.LogDescription),
          name: parsed.name,
        };
      }
    }

    return null;
  },
  preparePayload: async (events, logger) => {
    const replyIds = events.reduce((set, event) => {
      switch (event.wrangled.name) {
        case 'ReplyEdited':
        case 'ReplyAdded': {
          set.add(event.wrangled.args.replyId);
        }
      }

      return set;
    }, new Set<bigint>());

    const replies = await blockchainManager.ethosDiscussion.repliesById(Array.from(replyIds));
    const replyLookup: Map<bigint, DiscussionTypes.EthosDiscussion.ReplyStructOutput> =
      replies.reduce((map, value) => {
        map.set(value.id, value);

        return map;
      }, new Map());

    const repliesCreated = new Map<bigint, Prisma.ReplyCreateManyInput>();
    const replyUpdates: Prisma.ReplyUpdateManyArgs[] = [];
    const replyEventsCreated: Prisma.ReplyEventUncheckedCreateInput[] = [];

    for (const event of events) {
      const replyId = event.wrangled.args.replyId;

      replyEventsCreated.push({
        eventId: event.id,
        replyId: Number(replyId),
        type: eventTypeByEventName.get(event.wrangled.name),
      });

      const reply = replyLookup.get(replyId);

      if (!reply) {
        logger.warn({ data: { replyId } }, 'reply_not_found');
        continue;
      }

      switch (event.wrangled.name) {
        case 'ReplyAdded': {
          repliesCreated.set(reply.id, {
            id: Number(reply.id),
            parentId: Number(reply.parentId),
            targetContract: reply.targetContract,
            authorProfileId: Number(reply.authorProfileId),
            createdAt: getDateFromUnix(reply.createdAt),
            content: reply.content,
            metadata: reply.metadata,
            parentIsOriginalComment: reply.parentIsOriginalComment,
            contract: toPrismaContract(
              blockchainManager.getContractName(getAddress(reply.targetContract)),
            ),
          });
          break;
        }
        case 'ReplyEdited': {
          replyUpdates.push({
            data: { content: reply.content, metadata: reply.metadata },
            where: { id: Number(reply.id) },
          });

          break;
        }
      }
    }

    return {
      payload: {
        replyCreates: Array.from(repliesCreated.values()),
        replyUpdates: Array.from(replyUpdates.values()),
        replyEventCreates: Array.from(replyEventsCreated.values()),
      },
      dirtyScoreTargets: [],
    };
  },
  submitPayload: async ({ replyCreates, replyUpdates, replyEventCreates }) => {
    await prisma.$transaction([
      prisma.reply.createMany({ data: replyCreates }),
      // eslint-disable-next-line @typescript-eslint/promise-function-async
      ...replyUpdates.map((x) => prisma.reply.updateMany(x)),
      prisma.replyEvent.createMany({ data: replyEventCreates }),
    ]);

    await sendReplyNotificationToUsers(replyCreates);
  },
};

const eventTypeByEventName = new Map<string, ReplyEventType>([
  ['ReplyAdded', ReplyEventType.CREATE],
  ['ReplyEdited', ReplyEventType.EDIT],
]);
