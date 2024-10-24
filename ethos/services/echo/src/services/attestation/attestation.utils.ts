import { z } from 'zod';

export const attestationSchema = z.object({
  profileIds: z.array(z.number()).optional(),
  attestationHashes: z.array(z.string()).optional(),
  archived: z.boolean().optional(),
  orderBy: z
    .union([
      z.object({ createdAt: z.enum(['asc', 'desc']) }),
      z.object({ updatedAt: z.enum(['asc', 'desc']) }),
    ])
    .optional(),
});
