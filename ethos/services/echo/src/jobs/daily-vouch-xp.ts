import { type ProfileId } from '@ethos/blockchain-manager';
import { BASE_VOUCH_DAY_XP_GAIN } from '@ethos/domain';
import { XpPointsHistoryItemType } from '@prisma-pg/client';
import { prisma } from '../data/db.js';
import { getTargetScoreXpMultiplier } from '../data/score/xp.js';
import { getVouchEthDays, getMutualVouchEthDays } from '../data/vouch.js';
import { jobCompletedCounter, jobFailedCounter, jobDuration } from './job-metrics.js';

export const CALCULATE_VOUCH_POINTS = 'calculateVouchPoints';

/**
 * Calculates and awards XP to profiles based on their vouch staking activity.
 * This function can be run multiple times as it tracks point differences and only awards new points since last run.
 *
 * The calculation process:
 * 1. Queries total stake-days for each profile (stake amount × days staked)
 * 2. Calculates base points using BASE_VOUCH_DAY_XP_GAIN multiplier
 * 3. Applies profile-specific score multipliers
 * 4. Creates XP history entries for new points earned
 *
 * @throws Will throw if database queries fail
 */
export async function calculateVouchPoints(): Promise<void> {
  const startTime = Date.now();

  try {
    // This SQL query calculates the total "stake-days" for each profile that has made vouches
    // For example: if you staked 10 ETH for 3 days, that's 30 stake-days
    // The calculation handles both:
    // - Active vouches (using current time - vouchedAt)
    // - Ended vouches (using unvouchedAt - vouchedAt)

    // TODO do this iteratively, not all at once
    const vouches = await prisma.vouch.findMany({
      select: {
        authorProfileId: true,
        // note: this uses the staked amount, not the balance; if a user receives vouch rewards,
        // they'll have a higher balance, but the staked amount will be remain equal to their initial deposit
        staked: true,
        vouchedAt: true,
        unvouchedAt: true,
        mutualVouch: {
          select: { staked: true, vouchedAt: true, unvouchedAt: true },
        },
      },
    });

    const xpCalculation = new Map<
      ProfileId,
      { stakedEthDays: number; mutualStakedEthDays: number }
    >();

    for (const vouch of vouches) {
      // handle primary vouch
      let stakedEthDays = xpCalculation.get(vouch.authorProfileId)?.stakedEthDays ?? 0;
      let mutualStakedEthDays = xpCalculation.get(vouch.authorProfileId)?.mutualStakedEthDays ?? 0;

      stakedEthDays += getVouchEthDays(vouch);
      mutualStakedEthDays += getMutualVouchEthDays(vouch);

      xpCalculation.set(vouch.authorProfileId, { stakedEthDays, mutualStakedEthDays });
    }

    // For each profile that has earned points:
    for (const [profileId, { stakedEthDays, mutualStakedEthDays }] of xpCalculation.entries()) {
      // Get their score-based XP multiplier
      const scoreXpMultiplier = await getTargetScoreXpMultiplier({ profileId });
      // Calculate the points
      const vouchPoints = Math.round(stakedEthDays * BASE_VOUCH_DAY_XP_GAIN);
      const mutualVouchPoints = Math.round(mutualStakedEthDays * BASE_VOUCH_DAY_XP_GAIN);
      const totalPoints = vouchPoints + mutualVouchPoints;
      const multipliedPoints = Math.round(totalPoints * scoreXpMultiplier);

      // Find their last vouch XP history entry to calculate the difference
      const lastEntry = await prisma.xpPointsHistory.findFirst({
        select: { metadata: true },
        where: { profileId, type: XpPointsHistoryItemType.VOUCH_DAY },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate how many new points they've earned since last time
      const lastPoints = isVouchDayMetadata(lastEntry?.metadata)
        ? lastEntry.metadata.multipliedPoints
        : 0;
      const pointsDifference = Math.floor(multipliedPoints - lastPoints);

      // If they've earned new points, create an XP history entry
      if (pointsDifference > 0) {
        await prisma.xpPointsHistory.create({
          data: {
            profileId,
            points: pointsDifference,
            type: XpPointsHistoryItemType.VOUCH_DAY,
            metadata: {
              type: 'vouchDay',
              stakedEthDays,
              vouchPoints,
              mutualVouchPoints,
              scoreXpMultiplier,
              multipliedPoints,
            },
            createdAt: new Date(),
          },
        });
      }
    }

    jobCompletedCounter.inc({ job: CALCULATE_VOUCH_POINTS });
  } catch (error) {
    jobFailedCounter.inc({ job: CALCULATE_VOUCH_POINTS });
    throw error;
  } finally {
    const duration = Date.now() - startTime;
    jobDuration.observe({ job: CALCULATE_VOUCH_POINTS }, duration);
  }
}

// TODO - as we add more types of XP, we should create a union type for all metadata
export type VouchDayMetadata = {
  type: 'vouchDay';
  stakedEthDays: number;
  vouchPoints: number;
  mutualVouchPoints: number;
  scoreXpMultiplier: number;
  multipliedPoints: number;
};

export function isVouchDayMetadata(value: unknown): value is VouchDayMetadata {
  const metadata = value as Record<string, unknown>;

  return (
    metadata?.type === 'vouchDay' &&
    typeof metadata?.stakedEthDays === 'number' &&
    typeof metadata?.vouchPoints === 'number' &&
    typeof metadata?.mutualVouchPoints === 'number' &&
    typeof metadata?.scoreXpMultiplier === 'number' &&
    typeof metadata?.multipliedPoints === 'number'
  );
}
