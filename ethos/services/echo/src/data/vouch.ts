import { type Vouch } from '@ethos/blockchain-manager';
import { type EthosUserTarget } from '@ethos/domain';
import { duration } from '@ethos/helpers';
import { maxVouchedEthDays } from '@ethos/score';
import { type Prisma } from '@prisma-pg/client';
import { convert, weiToEth } from './conversion.js';
import { prisma } from './db.js';
import { user } from './user/lookup/index.js';

/**
 * Retrieves the total amount of ETH vouched for a specific user multiplied
 * by the number of days since the vouch was created, up to a configurable maximum
 * @param target - the Ethos user target who is the subject of the vouch(es)
 * @param maxDays - the maximum number of days to count towards multiplied ethDays
 */
export async function getVouchedEthDays(
  target: EthosUserTarget,
  maxDays: number = maxVouchedEthDays,
): Promise<{
  stakedEthDays: number;
  mutualStakedEthDays: number;
  vouches: number;
  mutualVouches: number;
}> {
  const profileId = await user.getProfileId(target);

  if (!profileId) return { stakedEthDays: 0, mutualStakedEthDays: 0, vouches: 0, mutualVouches: 0 };

  const vouches = await prisma.vouch.findMany({
    where: {
      subjectProfileId: profileId,
      archived: false,
    },
    select: {
      staked: true,
      vouchedAt: true,
      unvouchedAt: true,
      mutualVouch: {
        select: { staked: true, vouchedAt: true, unvouchedAt: true },
      },
    },
  });

  const totalEthDays = { stakedEthDays: 0, mutualStakedEthDays: 0, vouches: 0, mutualVouches: 0 };

  for (const vouch of vouches) {
    totalEthDays.stakedEthDays += getVouchEthDays(vouch, maxDays);
    totalEthDays.mutualStakedEthDays += getMutualVouchEthDays(vouch);
    totalEthDays.vouches += 1;

    if (vouch.mutualVouch) totalEthDays.mutualVouches += 1;
  }

  return totalEthDays;
}

/**
 * Gets the total number of unique vouchers for a specific user
 * @param target - The user target object containing identifier information
 * @returns The count of active vouchers for the user
 */
export async function getNumVouchers(target: EthosUserTarget): Promise<number> {
  const profileId = await user.getProfileId(target);

  if (!profileId) return 0;

  return await prisma.vouch.count({ where: { subjectProfileId: profileId, archived: false } });
}

/**
 * Retrieves all active vouches written by a specific author (user target)
 * @param target - The target user whose authored vouches to fetch
 * @returns Promise resolving to an array of Vouch objects, or empty array if profile not found
 * @throws May throw if database queries fail
 */
export async function getVouchesByAuthor(target: EthosUserTarget): Promise<Vouch[]> {
  const profileId = await user.getProfileId(target);

  // only ethos profiles can author vouches
  if (!profileId) return [];

  const vouches = await prisma.vouch.findMany({
    where: {
      authorProfileId: profileId,
      archived: false,
    },
  });

  return vouches.map(convert.toVouch);
}

/* Utility functions */

/**
 * Calculates the number of days * staked ETH for a given vouch.
 *
 * @param vouch - The vouch payload containing staking and timing information.
 * @param maxDays - The maximum number of days to consider for the calculation. Defaults to `maxVouchedEthDays`.
 * @returns The total ETH days calculated by multiplying the staked ETH by the number of days elapsed.
 */
export function getVouchEthDays(vouch: VouchPayload, maxDays: number = maxVouchedEthDays): number {
  return weiToEth(vouch.staked) * calculateDaysElapsed(vouch.vouchedAt, vouch.unvouchedAt, maxDays);
}

/**
 * Calculates the number of days this vouch has been mutually vouched,
 * multiplied by the balance of staked ETH shared between the two vouches (ie, lowest of the two)
 *
 * @param vouch - The vouch payload containing mutual staking and timing information.
 * @param maxDays - The maximum number of days to consider for the calculation. Defaults to `maxVouchedEthDays`.
 * @returns The mutual ETH days calculated by multiplying the minimum of staked ETH and mutual staked ETH by the number of days elapsed.
 *          Returns 0 if there is no mutual vouch.
 */
export function getMutualVouchEthDays(
  vouch: VouchPayload,
  maxDays: number = maxVouchedEthDays,
): number {
  if (!vouch.mutualVouch) return 0;

  // use the later of the two vouchedAt dates as the start date;
  // only count the overlap between the two vouches
  const startDate = new Date(
    Math.max(vouch.vouchedAt.getTime(), vouch.mutualVouch.vouchedAt.getTime()),
  );

  return (
    Math.min(weiToEth(vouch.staked), weiToEth(vouch.mutualVouch.staked)) *
    calculateDaysElapsed(startDate, vouch.mutualVouch.unvouchedAt, maxDays)
  );
}

/** Calculates the number of days between two dates, optionally capped at a maximum value.
 *  If the end date is not provided, the current date is used.
 */
function calculateDaysElapsed(startDate: Date, endDate: Date | null, maxDays?: number): number {
  const end = endDate?.getTime() ?? Date.now();
  const days = duration(end - startDate.getTime(), 'ms').toDays();

  return maxDays !== undefined ? Math.min(days, maxDays) : days;
}

type VouchPayload = Prisma.VouchGetPayload<{
  select: {
    staked: true;
    vouchedAt: true;
    unvouchedAt: true;
    mutualVouch: {
      select: {
        staked: true;
        vouchedAt: true;
        unvouchedAt: true;
      };
    };
  };
}>;
