import { type Prisma } from '@prisma/client';
import { z } from 'zod';

export const vouchSchema = z.object({
  ids: z.number().array().optional(),
  authorProfileIds: z.number().positive().array().optional(),
  subjectProfileIds: z.number().positive().array().optional(),
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
