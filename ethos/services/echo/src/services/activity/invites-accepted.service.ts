import { type ActivityActor } from '@ethos/domain';
import { notEmpty } from '@ethos/helpers';
import { z } from 'zod';
import { invitation } from '../../data/invitation/index.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';
import { getActors } from './utility.js';

const schema = z.object({
  profileId: validators.profileId,
  limit: z.coerce.number().nonnegative().int().optional(),
});

type Input = z.infer<typeof schema>;

export class InvitesAcceptedService extends Service<typeof schema, ActivityActor[]> {
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
    const actors = await getActors(actorTargets);

    return actors;
  }
}
