import {
  activities,
  attestationActivity,
  invitationAcceptedActivity,
  reviewActivity,
  unvouchActivity,
  vouchActivity,
  type ActivityInfo,
} from '@ethos/domain';
import { z } from 'zod';
import { type AnyRecord } from '../service.types';
import { SharedActivity } from './shared.activity';

// Example of a valid schema
/*
const input = { review: [1, 2, 3], vouch: [1, 2, 3] };
where 'review' and 'vouch' are keys from activities
*/
const schema = z.object({
  review: z.array(z.coerce.number().positive()).optional(),
  vouch: z.array(z.coerce.number().positive()).optional(),
  unvouch: z.array(z.coerce.number().positive()).optional(),
  attestation: z.array(z.coerce.number().positive()).optional(),
  'invitation-accepted': z.array(z.coerce.number().positive()).optional(),
  currentUserProfileId: z.number().positive().nullable(),
});

type BulkActivityIds = z.infer<typeof schema>;

export class BulkActivityService extends SharedActivity<typeof schema, ActivityInfo[]> {
  validate(params: AnyRecord): BulkActivityIds {
    return this.validator(params, schema);
  }

  async execute(input: BulkActivityIds): Promise<ActivityInfo[]> {
    const output = await Promise.all(
      activities.map(async (type) => {
        if (!input[type]) return [];
        switch (type) {
          case reviewActivity:
            return await this.getReviews(input[type], input.currentUserProfileId);
          case vouchActivity:
            return await this.getVouches(input[type], input.currentUserProfileId);
          case unvouchActivity:
            return await this.getUnvouches(input[type], input.currentUserProfileId);
          case attestationActivity:
            return await this.getAttestations(input[type]);
          case invitationAcceptedActivity:
            return await this.getProfileActivities(input[type]);
        }
      }),
    );

    return output.flat().sort((a, b) => b.timestamp - a.timestamp);
  }
}
