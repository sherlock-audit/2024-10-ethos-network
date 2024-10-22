import { type ActivityActor } from '@ethos/domain';
import { notEmpty } from '@ethos/helpers';
import { z } from 'zod';
import { invitation } from '../../data/invitation';
import { type AnyRecord } from '../service.types';
import { SharedActivity } from './shared.activity';

const schema = z.object({
  profileId: z
    .string()
    .refine((val) => !isNaN(Number(val)), { message: 'invalid profileId' })
    .transform((val) => Number(val)),
  limit: z
    .string()
    .optional()
    .refine((val) => !isNaN(Number(val)), { message: 'invalid limit' })
    .transform((val) => Number(val)),
});

type Input = z.infer<typeof schema>;

export class InvitesAcceptedService extends SharedActivity<typeof schema, ActivityActor[]> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute(props: Input): Promise<ActivityActor[]> {
    const acceptedInviteActors = await this.getInivtesAcceptedBy(props);

    return acceptedInviteActors;
  }

  private async getInivtesAcceptedBy({ profileId, limit }: Input): Promise<ActivityActor[]> {
    const invitations = await invitation.getInvitesAcceptedBy(profileId, limit);
    const actorTargets = invitations
      .map((i) => i.acceptedProfileId)
      .filter(notEmpty)
      .map((profileId) => ({
        profileId,
      }));
    const actors = await this.getActors(actorTargets);

    return actors;
  }
}
