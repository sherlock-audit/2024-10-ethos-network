import { type MarketTypes } from '@ethos/contracts';
import { getDateFromUnix } from '@ethos/helpers';
import { type Prisma } from '@prisma/client';
import { blockchainManager } from '../common/blockchain-manager';
import { prisma } from '../data/db';
import { type EventProcessor, type WrangledEvent } from './event-processing';

type MarketProfileId = number;

type Payload = {
  marketCreates: Prisma.MarketCreateManyInput[];
  marketUpdates: Prisma.MarketUpdateManyArgs[];
  marketUpdateEventCreates: Prisma.MarketUpdatedEventCreateManyInput[];
  marketVoteEventCreates: Prisma.MarketVoteEventCreateManyInput[];
};

type EventUnion =
  | WrangledEvent<'MarketCreated', MarketTypes.MarketCreatedEvent.LogDescription>
  | WrangledEvent<'VotesBought', MarketTypes.VotesBoughtEvent.LogDescription>
  | WrangledEvent<'VotesSold', MarketTypes.VotesSoldEvent.LogDescription>
  | WrangledEvent<'MarketUpdated', MarketTypes.MarketUpdatedEvent.LogDescription>;

export const marketEventProcessor: EventProcessor<EventUnion, Payload> = {
  ignoreEvents: new Set([]),
  getLogs: async (...args) => await blockchainManager.getMarketEvents(...args),
  parseLog: (log) => blockchainManager.reputationMarket.contract.interface.parseLog(log),
  eventWrangler: (parsed) => {
    switch (parsed.name) {
      case 'MarketCreated': {
        return {
          ...(parsed as unknown as MarketTypes.MarketCreatedEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'VotesBought': {
        return {
          ...(parsed as unknown as MarketTypes.VotesBoughtEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'VotesSold': {
        return {
          ...(parsed as unknown as MarketTypes.VotesSoldEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'MarketUpdated': {
        return {
          ...(parsed as unknown as MarketTypes.MarketUpdatedEvent.LogDescription),
          name: parsed.name,
        };
      }
    }

    return null;
  },
  preparePayload: async (events) => {
    const marketCreates = new Map<MarketProfileId, Prisma.MarketCreateManyInput>();
    const marketUpdates: Prisma.MarketUpdateManyArgs[] = [];
    const marketUpdateEventCreates: Prisma.MarketUpdatedEventCreateManyInput[] = [];
    const marketVoteEventCreates: Prisma.MarketVoteEventCreateManyInput[] = [];

    for (const event of events) {
      switch (event.wrangled.name) {
        case 'MarketCreated': {
          const { args } = event.wrangled;
          marketCreates.set(Number(args.profileId), {
            profileId: Number(args.profileId),
            creatorAddress: args.creator,
            positivePrice: '0',
            negativePrice: '0',
            trustVotes: 1,
            distrustVotes: 1,
          });
          break;
        }
        case 'MarketUpdated': {
          const { args } = event.wrangled;
          marketUpdateEventCreates.push({
            eventId: event.id,
            marketProfileId: Number(args.profileId),
            positivePrice: args.positivePrice.toString(),
            negativePrice: args.negativePrice.toString(),
            deltaVoteTrust: Number(args.deltaVoteTrust),
            deltaVoteDistrust: Number(args.deltaVoteDistrust),
            deltaPositivePrice: args.deltaPositivePrice.toString(),
            deltaNegativePrice: args.deltaNegativePrice.toString(),
            blockNumber: Number(args.blockNumber),
            createdAt: getDateFromUnix(args.updatedAt),
          });
          marketUpdates.push({
            data: {
              positivePrice: args.positivePrice.toString(),
              negativePrice: args.negativePrice.toString(),
              trustVotes: Number(args.voteTrust),
              distrustVotes: Number(args.voteDistrust),
            },
            where: { profileId: Number(args.profileId) },
          });

          break;
        }
        case 'VotesBought': {
          const { args } = event.wrangled;
          marketVoteEventCreates.push({
            eventId: event.id,
            type: 'BUY',
            actorAddress: args.buyer,
            isPositive: args.isPositive,
            amount: Number(args.amount),
            funds: args.funds.toString(),
            marketProfileId: Number(args.profileId),
            createdAt: getDateFromUnix(args.boughtAt),
          });

          break;
        }
        case 'VotesSold': {
          const { args } = event.wrangled;
          marketVoteEventCreates.push({
            eventId: event.id,
            type: 'SELL',
            actorAddress: args.seller,
            isPositive: args.isPositive,
            amount: Number(args.amount),
            funds: args.funds.toString(),
            marketProfileId: Number(args.profileId),
            createdAt: getDateFromUnix(args.soldAt),
          });

          break;
        }
      }
    }

    return {
      payload: {
        marketCreates: Array.from(marketCreates.values()),
        marketUpdates: Array.from(marketUpdates.values()),
        marketUpdateEventCreates: Array.from(marketUpdateEventCreates.values()),
        marketVoteEventCreates: Array.from(marketVoteEventCreates.values()),
      },
      dirtyScoreTargets: [], // Reputation markets do not affect scores.
    };
  },
  submitPayload: async ({
    marketCreates,
    marketUpdates,
    marketUpdateEventCreates,
    marketVoteEventCreates,
  }) => {
    await prisma.$transaction([
      prisma.market.createMany({ data: marketCreates }),
      // eslint-disable-next-line @typescript-eslint/promise-function-async
      ...marketUpdates.map((x) => prisma.market.updateMany(x)),
      prisma.marketUpdatedEvent.createMany({ data: marketUpdateEventCreates }),
      prisma.marketVoteEvent.createMany({ data: marketVoteEventCreates }),
    ]);
  },
};
