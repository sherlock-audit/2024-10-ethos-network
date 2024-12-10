import { type Prisma } from '@prisma-pg/client';
import { z } from 'zod';
import { validators } from '../service.validator.js';

export const vouchSchema = z.object({
  ids: z.number().array().optional(),
  authorProfileIds: z.array(validators.profileId).optional(),
  subjectProfileIds: z.array(validators.profileId).optional(),
  archived: z.boolean().optional(),
});

export function paramsToWhere(searchBy: z.infer<typeof vouchSchema>): Prisma.VouchWhereInput {
  const where: Prisma.VouchWhereInput = {
    id: { in: searchBy.ids },
    authorProfileId: { in: searchBy.authorProfileIds },
    subjectProfileId: { in: searchBy.subjectProfileIds },
    archived: searchBy.archived,
  };

  return where;
}
