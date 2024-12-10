import { type Vouch } from '@ethos/blockchain-manager';
import { type VouchTypes } from '@ethos/contracts';
import { type EthosUserTarget } from '@ethos/domain';
import { getDateFromUnix } from '@ethos/helpers';
import { type Logger } from '@ethos/logger';
import { type Prisma, VouchEventType } from '@prisma-pg/client';
import { blockchainManager } from '../common/blockchain-manager.js';
import { convert } from '../data/conversion.js';
import { prisma } from '../data/db.js';
import { type EventProcessor, type WrangledEvent } from './event-processing.js';
import {
  sendUnVouchNotificationToUsers,
  sendVouchNotificationToUsers,
  type UnVouchNotificationInput,
} from './user-notifications.js';

type VouchId = Vouch['id'];

type Payload = {
  vouchCreates: Prisma.VouchCreateManyInput[];
  vouchUpdates: Prisma.VouchUpdateManyArgs[];
  vouchEventCreates: Prisma.VouchEventUncheckedCreateInput[];
  rewardCreates: Prisma.RewardsCreateManyInput[];
  rewardUpdates: Prisma.RewardsUpdateManyArgs[];
};

type EventUnion =
  | WrangledEvent<'Vouched', VouchTypes.VouchedEvent.LogDescription>
  | WrangledEvent<'Unvouched', VouchTypes.UnvouchedEvent.LogDescription>
  | WrangledEvent<'MarkedUnhealthy', VouchTypes.MarkedUnhealthyEvent.LogDescription>
  | WrangledEvent<'VouchIncreased', VouchTypes.VouchIncreasedEvent.LogDescription>
  | WrangledEvent<'DepositedToRewards', VouchTypes.DepositedToRewardsEvent.LogDescription>
  | WrangledEvent<'WithdrawnFromRewards', VouchTypes.WithdrawnFromRewardsEvent.LogDescription>
  | WrangledEvent<'Slashed', VouchTypes.SlashedEvent.LogDescription>;

export const vouchEventProcessor: EventProcessor<EventUnion, Payload> = {
  ignoreEvents: new Set([
    'FeeChanged',
    'FeeReceiverChanged',
    'EntryProtocolFeeBasisPointsUpdated',
    'EntryDonationFeeBasisPointsUpdated',
    'EntryVouchersPoolFeeBasisPointsUpdated',
    'ExitFeeBasisPointsUpdated',
    'ProtocolFeeAddressUpdated',
  ]),
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
      case 'VouchIncreased': {
        return {
          ...(parsed as unknown as VouchTypes.VouchIncreasedEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'DepositedToRewards': {
        return {
          ...(parsed as unknown as VouchTypes.DepositedToRewardsEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'WithdrawnFromRewards': {
        return {
          ...(parsed as unknown as VouchTypes.WithdrawnFromRewardsEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'Slashed': {
        return {
          ...(parsed as unknown as VouchTypes.SlashedEvent.LogDescription),
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
    const rewardCreates: Prisma.RewardsCreateManyInput[] = [];
    const rewardUpdates: Prisma.RewardsUpdateManyArgs[] = [];

    for (const event of events) {
      const { args } = event.wrangled;
      // not all events have a vouchId; use MAX_SAFE_INTEGER and hopefully by the time we need to fix this we'll all be rich
      const vouchId: VouchId = 'vouchId' in args ? Number(args.vouchId) : Number.MAX_SAFE_INTEGER;

      vouchEventCreates.push({
        eventId: event.id,
        vouchId,
        type: eventTypeByEventName.get(event.wrangled.name),
      });

      const vouch = await blockchainManager.ethosVouch.getVouch(vouchId);

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
          // terminology
          // in smart contract, `amountStaked` is the amount sent before fees
          // in the smart contract, `amountDeposited` is the amount vouched after fees
          // in the db, `staked` is the amount sent before fees
          // in the db, `deposited` is the amount vouched after fees
          // in the db, `balance` is the amount vouched after fees (to be updated as balance increases)
          const staked = convert.toDecimal(event.wrangled.args.amountStaked);
          const deposited = convert.toDecimal(event.wrangled.args.amountDeposited);
          const balance = deposited;
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
            authorAddress: vouch.authorAddress,
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
          const withdrawn = convert.toDecimal(event.wrangled.args.amountWithdrawn);
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
        case 'VouchIncreased': {
          const staked = convert.toDecimal(event.wrangled.args.amountStaked);
          const deposited = convert.toDecimal(event.wrangled.args.amountDeposited);
          const vouchBalance = convert.toDecimal(vouch.balance);

          // Get existing staked and deposited values from DB
          const existingVouchData = await prisma.vouch.findUnique({
            where: { id: vouchId },
            select: { staked: true, deposited: true },
          });

          if (!existingVouchData) {
            logger.error({ data: { vouchId } }, 'vouch_not_found_for_increase');
            continue;
          }

          vouchUpdates.push({
            data: {
              balance: vouchBalance,
              staked: existingVouchData.staked.plus(staked).toString(),
              deposited: existingVouchData.deposited.plus(deposited).toString(),
            },
            where: { id: vouchId },
          });

          // when vouch incentives are enabled
          // increasing a vouch also increases every other vouch balance
          // for vouches with the same subject
          vouchUpdates.push(...(await updatePeerVouchBalances(vouch, logger)));

          break;
        }
        case 'DepositedToRewards': {
          const recipientProfileId = Number(event.wrangled.args.recipientProfileId);
          const amount = convert.toDecimal(event.wrangled.args.amount);

          const existingReward = await prisma.rewards.findFirst({
            where: { profileId: recipientProfileId },
          });

          if (existingReward) {
            rewardUpdates.push({
              data: {
                balance: existingReward.balance.plus(amount).toString(),
                lifetime: existingReward.lifetime.plus(amount).toString(),
              },
              where: { profileId: recipientProfileId },
            });
          } else {
            rewardCreates.push({
              profileId: recipientProfileId,
              balance: amount,
              lifetime: amount,
            });
          }
          break;
        }
        case 'WithdrawnFromRewards': {
          const accountProfileId = Number(event.wrangled.args.accountProfileId);
          rewardUpdates.push({
            data: { balance: '0' },
            where: { profileId: accountProfileId },
          });
          break;
        }
        case 'Slashed': {
          const authorProfileId = Number(event.wrangled.args.authorProfileId);
          const slashBasisPoints = event.wrangled.args.slashBasisPoints;
          const totalSlashed = event.wrangled.args.totalSlashed;
          logger.error({ authorProfileId, slashBasisPoints, totalSlashed }, 'slash_event_emitted');
        }
      }
    }

    return {
      payload: {
        vouchCreates: Array.from(vouchCreates.values()),
        vouchUpdates,
        vouchEventCreates: Array.from(vouchEventCreates.values()),
        rewardCreates,
        rewardUpdates,
      },
      dirtyScoreTargets,
    };
  },
  submitPayload: async ({
    vouchCreates,
    vouchUpdates,
    vouchEventCreates,
    rewardCreates,
    rewardUpdates,
  }) => {
    await prisma.$transaction([
      prisma.vouch.createMany({ data: vouchCreates }),
      // eslint-disable-next-line @typescript-eslint/promise-function-async
      ...vouchUpdates.map((x) => prisma.vouch.updateMany(x)),
      prisma.vouchEvent.createMany({ data: vouchEventCreates }),
      prisma.rewards.createMany({ data: rewardCreates }),
      // eslint-disable-next-line @typescript-eslint/promise-function-async
      ...rewardUpdates.map((x) => prisma.rewards.updateMany(x)),
    ]);

    await sendVouchNotificationToUsers(
      vouchCreates.map((vouch) => ({
        id: vouch.id,
        stakedAmount: convert.toBigint(vouch.staked),
        comment: vouch.comment,
        authorProfileId: vouch.authorProfileId,
        subjectProfileId: vouch.subjectProfileId,
      })),
    );
    const unVouchNotificationInputs: UnVouchNotificationInput[] = (
      await Promise.all(
        vouchUpdates
          .filter((vouchUpdate) => vouchUpdate.data.withdrawn)
          .map(
            async (vouchUpdate) =>
              await prisma.vouch.findFirst({
                where: vouchUpdate.where,
              }),
          ),
      )
    )
      .filter((vouch) => vouch !== null)
      .map((vouch) => ({
        authorProfileId: vouch.authorProfileId,
        comment: vouch.comment,
        withdrawnAmount: convert.toBigint(vouch.withdrawn),
        id: vouch.id,
        subjectProfileId: vouch.subjectProfileId,
      }));
    await sendUnVouchNotificationToUsers(unVouchNotificationInputs);
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
  const balances = await Promise.all(
    vouches.map(async (vouch) => {
      try {
        const updatedVouch = await blockchainManager.ethosVouch.getVouch(vouch.id);

        if (!updatedVouch) {
          logger.error({ data: { vouchId: vouch.id } }, 'peer_vouch_not_found');

          return null;
        }
        const balance = updatedVouch.balance;

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

const eventTypeByEventName = new Map<string, VouchEventType>([
  ['Vouched', VouchEventType.CREATE],
  ['Unvouched', VouchEventType.UNVOUCH],
  ['MarkedUnhealthy', VouchEventType.UNHEALTHY],
  ['VouchIncreased', VouchEventType.INCREASE],
  ['DepositedToRewards', VouchEventType.DEPOSIT_REWARDS],
  ['WithdrawnFromRewards', VouchEventType.WITHDRAW_REWARDS],
  ['Slashed', VouchEventType.SLASH],
]);
