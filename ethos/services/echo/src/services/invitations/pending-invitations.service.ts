import { fromUserKey, type PendingInvitation } from '@ethos/domain';
import { z } from 'zod';
import { prisma } from '../../data/db';
import { getLatestScoreOrCalculate, simulateNewScore } from '../../data/score';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';
import { validators } from '../service.validator';
import { scoreImpact } from './invitation.service';

const schema = z.object({
  address: validators.address,
});

type Input = z.infer<typeof schema>;
type Output = PendingInvitation[];

/**
 * Retrieves a list of profileIds that have an active invitation sent to the given address
 */
export class PendingInvitations extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ address }: Input): Promise<Output> {
    const profiles = await prisma.profile.findMany({
      select: {
        id: true,
      },
      where: {
        invitesSent: {
          has: address.toLowerCase(),
        },
      },
    });

    const invitedAddressScore = await getLatestScoreOrCalculate(fromUserKey(`address:${address}`));

    const invitationsList: PendingInvitation[] = await Promise.all(
      profiles.map(async (p) => {
        const subjectScore = await getLatestScoreOrCalculate(fromUserKey(`profileId:${p.id}`));

        const newScore = await simulateNewScore(fromUserKey(`address:${address}`), {
          'Ethos Invitation Source Credibility': subjectScore.score * 0.2,
        });

        const impact = scoreImpact(invitedAddressScore.score, newScore.score);

        return {
          id: p.id,
          impact,
        };
      }),
    );

    // Order by relative impact ascending
    return invitationsList.sort(
      (a, b) => b.impact.adjustedRecipientScore - a.impact.adjustedRecipientScore,
    );
  }
}
