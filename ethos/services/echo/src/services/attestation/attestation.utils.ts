import { z } from 'zod';
import { validators } from '../service.validator.js';

export const attestationSchema = z.object({
  profileIds: z.array(validators.profileId).optional(),
  attestationHashes: z.array(z.string()).optional(),
  archived: z.boolean().optional(),
  orderBy: z
    .union([
      z.object({ createdAt: z.enum(['asc', 'desc']) }),
      z.object({ updatedAt: z.enum(['asc', 'desc']) }),
    ])
    .optional(),
});
