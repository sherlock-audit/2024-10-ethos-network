import { z } from 'zod';
import { prisma } from '../../data/db';
import { getLatestScoreOrCalculate } from '../../data/score';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';

const schema = z.object({
  profileId: z
    .string()
    .refine((val) => !isNaN(Number(val)), { message: 'invalid profileId' })
    .transform((val) => Number(val)),
  targetScore: z
    .string()
    .refine((val) => !isNaN(Number(val)), { message: 'invalid targetScore' })
    .transform((val) => Number(val)),
});

type Input = z.infer<typeof schema>;
type Output = {
  didAttest: boolean;
  didReview: boolean;
  didVouch: boolean;
  didVouchReciprocation: boolean;
  didSendAcceptedInvite: boolean;
  isScoreTargetReached: boolean;
};

export class OnboardingStatusService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute(params: Input): Promise<Output> {
    const [
      didAttest,
      didReview,
      didVouch,
      didVouchReciprocation,
      didSendAcceptedInvite,
      isScoreTargetReached,
    ] = await Promise.all([
      this.checkAttestation(params.profileId),
      this.checkReview(params.profileId),
      this.checkVouch(params.profileId),
      this.checkVouchReciprocation(params.profileId),
      this.checkSendAcceptedInvite(params.profileId),
      this.checkScoreTargetReached(params.profileId, params.targetScore),
    ]);

    const checklistResult = {
      didAttest,
      didReview,
      didVouch,
      didVouchReciprocation,
      didSendAcceptedInvite,
      isScoreTargetReached,
    };

    return checklistResult;
  }

  private async checkAttestation(profileId: number): Promise<boolean> {
    const result = await prisma.attestation.findFirst({
      select: { id: true },
      where: { profileId },
    });

    return Boolean(result);
  }

  private async checkReview(profileId: number): Promise<boolean> {
    const result = await prisma.review.findFirst({
      select: { id: true },
      where: { authorProfileId: profileId },
    });

    return Boolean(result);
  }

  private async checkVouch(profileId: number): Promise<boolean> {
    const result = await prisma.vouch.findFirst({
      select: { id: true },
      where: { authorProfileId: profileId },
    });

    return Boolean(result);
  }

  private async checkVouchReciprocation(profileId: number): Promise<boolean> {
    const result = await prisma.vouch.findFirst({
      select: { id: true },
      where: {
        authorProfileId: profileId,
        mutualVouchId: { not: null },
      },
    });

    return Boolean(result);
  }

  private async checkSendAcceptedInvite(profileId: number): Promise<boolean> {
    const result = await prisma.invitation.findFirst({
      select: { id: true },
      where: {
        senderProfileId: profileId,
        status: 'ACCEPTED',
      },
    });

    return Boolean(result);
  }

  private async checkScoreTargetReached(profileId: number, targetScore: number): Promise<boolean> {
    const scoreResult = await getLatestScoreOrCalculate({ profileId });

    return scoreResult.score >= targetScore;
  }
}
