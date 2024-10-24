import { type Vouch } from '@ethos/blockchain-manager';
import { type VouchTypes } from '@ethos/contracts';
import { type EthosUserTarget } from '@ethos/domain';
import { getDateFromUnix } from '@ethos/helpers';
import { type Logger } from '@ethos/logger';
import { Prisma, VouchEventType } from '@prisma/client';
import { blockchainManager } from '../common/blockchain-manager';
import { convert } from '../data/conversion';
import { prisma } from '../data/db';
import { type EventProcessor, type WrangledEvent } from './event-processing';

type VouchId = Vouch['id'];

type Payload = {
  vouchCreates: Prisma.VouchCreateManyInput[];
  vouchUpdates: Prisma.VouchUpdateManyArgs[];
  vouchEventCreates: Prisma.VouchEventUncheckedCreateInput[];
};

type EventUnion =
  | WrangledEvent<'Vouched', VouchTypes.VouchedEvent.LogDescription>
  | WrangledEvent<'Unvouched', VouchTypes.UnvouchedEvent.LogDescription>
  | WrangledEvent<'MarkedUnhealthy', VouchTypes.MarkedUnhealthyEvent.LogDescription>;

export const vouchEventProcessor: EventProcessor<EventUnion, Payload> = {
  ignoreEvents: new Set(['FeeChanged', 'FeeReceiverChanged']),
  getLogs: async (...args) => await blockchainManager.getVouchEvents(...args),
  parseLog: (log) => blockchainManager.ethosVouch.contract.interface.parseLog(log),
  eventWrangler: (parsed) => {
    switch (parsed.name) {
      case 'Vouched': {
        return {
          ...(parsed as unknown as VouchTypes.VouchedEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'Unvouched': {
        return {
          ...(parsed as unknown as VouchTypes.UnvouchedEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'MarkedUnhealthy': {
        return {
          ...(parsed as unknown as VouchTypes.MarkedUnhealthyEvent.LogDescription),
          name: parsed.name,
        };
      }
    }

    return null;
  },
  preparePayload: async (events, logger) => {
    const vouchCreates = new Map<VouchId, Prisma.VouchCreateManyInput>();
    const vouchUpdates: Prisma.VouchUpdateManyArgs[] = [];
    const vouchEventCreates: Prisma.VouchEventUncheckedCreateInput[] = [];
    const dirtyScoreTargets: EthosUserTarget[] = [];

    for (const event of events) {
      const { args } = event.wrangled;
      const vouchId: VouchId = Number(args.vouchId);

      vouchEventCreates.push({
        eventId: event.id,
        vouchId,
        type: eventTypeByEventName.get(event.wrangled.name),
      });

      const vouch = await blockchainManager.getVouch(vouchId);

      if (!vouch) {
        logger.warn({ data: { vouchId } }, 'vouch_not_found');
        continue;
      }

      dirtyScoreTargets.push({
        profileId: vouch.subjectProfileId,
      });

      switch (event.wrangled.name) {
        case 'Vouched': {
          let mutualVouchId: number | null = null;

          if (!vouch.archived) {
            const mutualVouch = await prisma.vouch.findFirst({
              where: {
                authorProfileId: vouch.subjectProfileId,
                subjectProfileId: vouch.authorProfileId,
                archived: false,
              },
            });

            if (mutualVouch) {
              mutualVouchId = mutualVouch.id;
              vouchUpdates.push({
                data: {
                  mutualVouchId: vouchId,
                },
                where: { id: mutualVouchId },
              });
            }
          }

          // TODO: update smart contract event; `amountStaked` is the amount deposited before fees
          const deposited = convert.toDecimal(event.wrangled.args.amountStaked);
          // TODO update smart contract event; include the amount after fees so we don't have to grab it
          const [staked, balance] = await Promise.all([
            getStakedAmountFromTxn(event.txHash, logger),
            getBalanceByVouchId(vouchId, logger),
          ]);
          const activityCheckpoints = {
            vouchedAt: getDateFromUnix(vouch.activityCheckpoints.vouchedAt),
            unvouchedAt:
              vouch.activityCheckpoints.unvouchedAt > 0
                ? getDateFromUnix(vouch.activityCheckpoints.unvouchedAt)
                : null,
            unhealthyAt:
              vouch.activityCheckpoints.unhealthyAt > 0
                ? getDateFromUnix(vouch.activityCheckpoints.unhealthyAt)
                : null,
          };

          vouchCreates.set(vouchId, {
            id: vouchId,
            archived: vouch.archived,
            unhealthy: vouch.unhealthy,
            authorProfileId: vouch.authorProfileId,
            stakeToken: vouch.stakeToken,
            subjectProfileId: vouch.subjectProfileId,
            deposited,
            staked,
            balance,
            ...activityCheckpoints,
            mutualVouchId,
            comment: vouch.comment,
            metadata: vouch.metadata,
          });

          // when vouch incentives are enabled
          // vouching for someone increases every other vouch balance
          // for vouches with the same subject
          vouchUpdates.push(...(await updatePeerVouchBalances(vouch, logger)));

          break;
        }
        case 'Unvouched': {
          const withdrawn = await getWithdrawnAmountFromTxn(event.txHash, logger);
          vouchUpdates.push({
            data: {
              archived: true,
              balance: 0,
              withdrawn,
              unvouchedAt: getDateFromUnix(vouch.activityCheckpoints.unvouchedAt),
              mutualVouchId: null,
            },
            where: { id: vouchId },
          });
          vouchUpdates.push({
            data: {
              mutualVouchId: null,
            },
            where: { mutualVouchId: vouchId },
          });
          break;
        }

        case 'MarkedUnhealthy':
          vouchUpdates.push({
            data: {
              archived: true,
              unhealthy: true,
              unhealthyAt: getDateFromUnix(vouch.activityCheckpoints.unvouchedAt),
              mutualVouchId: null,
            },
            where: { id: vouchId },
          });
          vouchUpdates.push({
            data: {
              mutualVouchId: null,
            },
            where: { mutualVouchId: vouchId },
          });
          break;
      }
    }

    return {
      payload: {
        vouchCreates: Array.from(vouchCreates.values()),
        vouchUpdates,
        vouchEventCreates: Array.from(vouchEventCreates.values()),
      },
      dirtyScoreTargets,
    };
  },
  submitPayload: async ({ vouchCreates, vouchUpdates, vouchEventCreates }) => {
    await prisma.$transaction([
      prisma.vouch.createMany({ data: vouchCreates }),
      // eslint-disable-next-line @typescript-eslint/promise-function-async
      ...vouchUpdates.map((x) => prisma.vouch.updateMany(x)),
      prisma.vouchEvent.createMany({ data: vouchEventCreates }),
    ]);
  },
};

async function updatePeerVouchBalances(
  vouch: Vouch,
  logger: Logger,
): Promise<Prisma.VouchUpdateManyArgs[]> {
  // get all vouches with the same subjectProfileId as this vouch
  const vouches = await prisma.vouch.findMany({
    where: {
      subjectProfileId: vouch.subjectProfileId,
    },
  });
  // get the balance for each vouch from the blockchain
  // TODO create a bulk getBalanceByVouchId method on the smart contract
  const balances = await Promise.all(
    vouches.map(async (vouch) => {
      try {
        const balance = await blockchainManager.getBalanceByVouchId(vouch.id);

        return {
          id: vouch.id,
          balance,
        };
      } catch (err) {
        logger.error({ err, data: { vouchId: vouch.id } }, 'error_getting_vouch_balance');

        return null;
      }
    }),
  );

  // update the balance for each vouch
  return vouches.map((vouch) => ({
    data: {
      balance: balances.find((b) => b?.id === vouch.id)?.balance.toString(),
    },
    where: { id: vouch.id },
  }));
}

async function getStakedAmountFromTxn(txHash: string, logger: Logger): Promise<Prisma.Decimal> {
  try {
    const { transfer } = await blockchainManager.getVouchEthTransfers(txHash);

    if (!transfer.deposit) {
      throw new Error('No deposit found');
    }

    return convert.toDecimal(transfer.deposit);
  } catch (err) {
    logger.error({ err, data: { txHash } }, 'error_getting_weth_staked_amount');

    return new Prisma.Decimal(0);
  }
}

// TODO - this doesn't include fees, fuck
async function getWithdrawnAmountFromTxn(txHash: string, logger: Logger): Promise<Prisma.Decimal> {
  try {
    const { transfer } = await blockchainManager.getVouchEthTransfers(txHash);

    if (!transfer.withdraw) {
      throw new Error('No withdraw found');
    }

    return convert.toDecimal(transfer.withdraw);
  } catch (err) {
    logger.error({ err, data: { txHash } }, 'error_getting_weth_withdrawn_amount');

    return new Prisma.Decimal(0);
  }
}

async function getBalanceByVouchId(vouchId: number, logger: Logger): Promise<Prisma.Decimal> {
  try {
    const balance = await blockchainManager.getBalanceByVouchId(vouchId);

    return convert.toDecimal(balance);
  } catch (err) {
    logger.error({ err, data: { vouchId } }, 'error_getting_vouch_balance');

    return new Prisma.Decimal(0);
  }
}

const eventTypeByEventName = new Map<string, VouchEventType>([
  ['Vouched', VouchEventType.CREATE],
  ['Unvouched', VouchEventType.UNVOUCH],
  ['MarkedUnhealthy', VouchEventType.UNHEALTHY],
]);
