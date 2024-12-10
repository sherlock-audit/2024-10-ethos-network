import { type VoteTypes } from '@ethos/contracts';
import { type EthosUserTarget } from '@ethos/domain';
import { getDateFromUnix } from '@ethos/helpers';
import { VoteEventType, type Prisma } from '@prisma-pg/client';
import { getAddress } from 'viem';
import { blockchainManager } from '../common/blockchain-manager.js';
import { prisma } from '../data/db.js';
import { getVoteTargetAuthorUserkey } from '../data/vote.js';
import { type EventProcessor, type WrangledEvent } from './event-processing.js';
import { toPrismaContract } from './index.js';

type VoteId = number;

type Payload = {
  voteUpserts: Prisma.VoteUpsertArgs[];
  voteEventCreates: Prisma.VoteEventCreateManyInput[];
};

type EventUnion =
  | WrangledEvent<'Voted', VoteTypes.VotedEvent.LogDescription>
  | WrangledEvent<'VoteChanged', VoteTypes.VoteChangedEvent.LogDescription>;

export const voteEventProcessor: EventProcessor<EventUnion, Payload> = {
  ignoreEvents: new Set([]),
  getLogs: async (...args) => await blockchainManager.getVoteEvents(...args),
  parseLog: (log) => blockchainManager.ethosVote.contract.interface.parseLog(log),
  eventWrangler: (parsed) => {
    switch (parsed.name) {
      case 'Voted': {
        return {
          ...(parsed as unknown as VoteTypes.VotedEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'VoteChanged': {
        return {
          ...(parsed as unknown as VoteTypes.VoteChangedEvent.LogDescription),
          name: parsed.name,
        };
      }
    }

    return null;
  },
  preparePayload: async (events, logger) => {
    const voteUpserts: Prisma.VoteUpsertArgs[] = [];
    const voteEventCreates: Prisma.VoteEventCreateManyInput[] = [];
    const dirtyScoreTargets: EthosUserTarget[] = [];

    for (const event of events) {
      const { args } = event.wrangled;
      const voteId: VoteId = Number(args.voteId);
      const vote = await blockchainManager.ethosVote.getVoteById(voteId);

      if (!vote) {
        logger.warn({ data: { voteId } }, 'vote_not_found');
        continue;
      }

      if (vote.isArchived) {
        voteEventCreates.push({ eventId: event.id, voteId, type: VoteEventType.ARCHIVE });
      } else {
        voteEventCreates.push({
          eventId: event.id,
          voteId,
          type: eventTypeByEventName.get(event.wrangled.name),
        });
      }

      switch (event.wrangled.name) {
        case 'Voted':
        case 'VoteChanged': {
          voteUpserts.push({
            create: {
              id: voteId,
              createdAt: getDateFromUnix(vote.createdAt),
              isArchived: vote.isArchived,
              isUpvote: vote.isUpvote,
              targetContract: vote.targetContract,
              targetId: Number(vote.targetId),
              voter: Number(vote.voter),
              contract: toPrismaContract(
                blockchainManager.getContractName(getAddress(vote.targetContract)),
              ),
            },
            // unarchiving a vote emits Voted
            update: {
              id: voteId,
              createdAt: getDateFromUnix(vote.createdAt),
              isArchived: vote.isArchived,
              isUpvote: vote.isUpvote,
              targetContract: vote.targetContract,
              targetId: Number(vote.targetId),
              voter: Number(vote.voter),
              contract: toPrismaContract(
                blockchainManager.getContractName(getAddress(vote.targetContract)),
              ),
            },
            where: {
              id: voteId,
            },
          });
          break;
        }
      }

      // find the author of the activity that was voted on, and reset their score
      dirtyScoreTargets.push(await getVoteTargetAuthorUserkey(vote));
    }

    return {
      payload: {
        voteUpserts: Array.from(voteUpserts.values()),
        voteEventCreates: Array.from(voteEventCreates.values()),
      },
      dirtyScoreTargets,
    };
  },
  submitPayload: async ({ voteUpserts, voteEventCreates }) => {
    await prisma.$transaction([
      // eslint-disable-next-line @typescript-eslint/promise-function-async
      ...voteUpserts.map((x) => prisma.vote.upsert(x)),
      prisma.voteEvent.createMany({ data: voteEventCreates }),
    ]);
  },
};

const eventTypeByEventName = new Map<string, VoteEventType>([
  ['Voted', VoteEventType.CREATE],
  ['VoteChanged', VoteEventType.UPDATE],
]);
