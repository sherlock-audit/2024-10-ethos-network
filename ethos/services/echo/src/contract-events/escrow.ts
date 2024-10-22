import { type EscrowTypes } from '@ethos/contracts';
import { Prisma } from '@prisma/client';
import { blockchainManager } from '../common/blockchain-manager';
import { prisma } from '../data/db';
import { type EventProcessor, type WrangledEvent } from './event-processing';

type Payload = {
  escrowCreates: Prisma.EscrowCreateManyInput[];
  escrowUpdates: Prisma.EscrowUpdateArgs[];
  escrowEventCreates: Prisma.EscrowEventCreateManyInput[];
};

type EventUnion =
  | WrangledEvent<'Deposited', EscrowTypes.DepositedEvent.LogDescription>
  | WrangledEvent<'Withdrawn', EscrowTypes.WithdrawnEvent.LogDescription>;

export const escrowEventProcessor: EventProcessor<EventUnion, Payload> = {
  ignoreEvents: new Set([]),
  getLogs: async (...args) => await blockchainManager.getEscrowEvents(...args),
  parseLog: (log) => blockchainManager.ethosEscrow.contract.interface.parseLog(log),
  eventWrangler: (parsed) => {
    switch (parsed.name) {
      case 'Deposited': {
        return {
          ...(parsed as unknown as EscrowTypes.DepositedEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'Withdrawn': {
        return {
          ...(parsed as unknown as EscrowTypes.WithdrawnEvent.LogDescription),
          name: parsed.name,
        };
      }
    }

    return null;
  },
  preparePayload: async (events, logger) => {
    const escrowCreates: Prisma.EscrowCreateManyInput[] = [];
    const escrowUpdates: Prisma.EscrowUpdateArgs[] = [];
    const escrowEventCreates: Prisma.EscrowEventCreateManyInput[] = [];

    for (const event of events) {
      const { args } = event.wrangled;

      escrowEventCreates.push({
        eventId: event.id,
        profileId: Number(args.profileId),
        token: args.token,
        amount: args.amount.toString(),
      });

      switch (event.wrangled.name) {
        case 'Deposited': {
          const existingEscrow = await prisma.escrow.findFirst({
            where: {
              profileId: Number(args.profileId),
              token: args.token,
            },
          });

          if (existingEscrow) {
            const existingLifetime = new Prisma.Decimal(String(existingEscrow.lifetime));
            const existingBalance = new Prisma.Decimal(String(existingEscrow.balance));
            const depositedAmount = new Prisma.Decimal(String(args.amount));
            const balance = existingBalance.plus(depositedAmount).toString();
            const lifetime = existingLifetime.plus(depositedAmount).toString();
            escrowUpdates.push({
              where: { id: existingEscrow.id },
              data: { balance, lifetime },
            });
          } else {
            escrowCreates.push({
              profileId: Number(args.profileId),
              token: args.token,
              balance: args.amount.toString(),
              lifetime: args.amount.toString(),
            });
          }

          break;
        }
        case 'Withdrawn': {
          const existingEscrow = await prisma.escrow.findFirst({
            where: {
              profileId: Number(args.profileId),
              token: args.token,
            },
          });

          if (existingEscrow) {
            const existingBalance = new Prisma.Decimal(String(existingEscrow.balance));
            const withdrawnAmount = new Prisma.Decimal(String(args.amount));
            const balance = existingBalance.minus(withdrawnAmount).toString();
            escrowUpdates.push({
              where: { id: existingEscrow.id },
              data: { balance },
            });
          } else {
            logger.warn(
              { data: { profileId: args.profileId, token: args.token } },
              'escrow_not_found_for_withdrawal',
            );
          }

          break;
        }
      }
    }

    return {
      payload: {
        escrowCreates,
        escrowUpdates,
        escrowEventCreates,
      },
      dirtyScoreTargets: [], // escrow doesn't impact score
    };
  },
  submitPayload: async (payload) => {
    await prisma.$transaction(async (tx) => {
      await tx.escrow.createMany({
        data: payload.escrowCreates,
        skipDuplicates: true,
      });

      for (const update of payload.escrowUpdates) {
        await tx.escrow.update(update);
      }
      await tx.escrowEvent.createMany({
        data: payload.escrowEventCreates,
      });
    });
  },
};
