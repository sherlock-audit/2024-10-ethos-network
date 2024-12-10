import { toUserKey, fromUserKey } from '@ethos/domain';
import { duration } from '@ethos/helpers';
import { createScoreCalculationJob } from '../contract-events/message-queue.js';
import { prisma } from '../data/db.js';
import { jobCompletedCounter, jobFailedCounter, jobDuration } from './job-metrics.js';

export const RESET_PROFILE_SCORES = 'resetProfileScores';

/**
 * Reset all profile scores that haven't been updated in the last 24 hours
 *
 * This is currently used for applying daily vouch score impact. It could be extended for any other
 * score impact that should be applied once per day.
 */
export async function resetProfileScores(): Promise<void> {
  const startTime = Date.now();
  const twentyFourHoursAgo = new Date(Date.now() - duration(1, 'day').toMilliseconds());

  try {
    // Get unique profile IDs from both authors and subjects of active vouches
    const where = { archived: false };
    const [authorProfiles, subjectProfiles] = await Promise.all([
      prisma.vouch.findMany({
        where,
        distinct: ['authorProfileId'],
        select: { authorProfileId: true },
      }),
      prisma.vouch.findMany({
        where,
        distinct: ['subjectProfileId'],
        select: { subjectProfileId: true },
      }),
    ]);

    // Combine and deduplicate profile IDs
    const profileIds = [
      ...new Set([
        ...authorProfiles.map((v) => v.authorProfileId),
        ...subjectProfiles.map((v) => v.subjectProfileId),
      ]),
    ];

    // convert profileIds to targets
    const targets = profileIds.map((id) => toUserKey({ profileId: id }));
    // Get profiles whose latest score update was more than 24 hours ago
    const profilesToUpdate = await prisma.scoreHistory.groupBy({
      by: ['target'],
      where: {
        target: { in: targets },
      },
      _max: {
        createdAt: true,
      },
      having: {
        createdAt: {
          _max: {
            lt: twentyFourHoursAgo,
          },
        },
      },
    });

    const outdatedEthosUserTargets = profilesToUpdate.map((p) => fromUserKey(p.target));

    // Trigger score updates for each outdated profile
    await Promise.all(
      outdatedEthosUserTargets.map(async (target) => {
        await createScoreCalculationJob(target);
      }),
    );

    jobCompletedCounter.inc({ job: RESET_PROFILE_SCORES });
  } catch (error) {
    jobFailedCounter.inc({ job: RESET_PROFILE_SCORES });
    throw error;
  } finally {
    const duration = Date.now() - startTime;
    jobDuration.observe({ job: RESET_PROFILE_SCORES }, duration);
  }
}
