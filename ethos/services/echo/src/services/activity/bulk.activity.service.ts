import { type ActivityInfo } from '@ethos/domain';
import { z } from 'zod';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';
import { UnifiedActivityService } from './unified-activity.service.js';

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
  currentUserProfileId: validators.profileId.nullable(),
});

type BulkActivityIds = z.infer<typeof schema>;

export class BulkActivityService extends Service<typeof schema, ActivityInfo[]> {
  validate(params: AnyRecord): BulkActivityIds {
    return this.validator(params, schema);
  }

  async execute({ currentUserProfileId, ...ids }: BulkActivityIds): Promise<ActivityInfo[]> {
    const limit = Object.values(ids).flat().length;

    const results = await this.useService(UnifiedActivityService).run({
      ids,
      currentUserProfileId,
      cache: false,
      orderBy: { field: 'timestamp', direction: 'desc' },
      pagination: { limit },
    });

    return results.values;
  }
}
