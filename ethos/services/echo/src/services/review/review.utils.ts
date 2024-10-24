import { Score } from '@ethos/blockchain-manager';
import { isValidAddress } from '@ethos/helpers';
import { type Prisma } from '@prisma/client';
import { type Address } from 'viem';
import { z } from 'zod';
import { getAttestationTargetBulk } from '../../data/user/lookup/attestation-target';

export const reviewSchema = z.object({
  ids: z.number().array().optional(),
  subject: z.string().array().optional(),
  author: z.string().array().optional(),
  attestation: z
    .union([
      z.object({
        service: z.string(),
        account: z.string(),
      }),
      z.object({
        service: z.string(),
        username: z.string(),
      }),
    ])
    .array()
    .optional(),
  archived: z.boolean().optional(),
  score: z.enum(['negative', 'neutral', 'positive']).array().optional(),
});

export async function paramsToWhere(
  searchBy: z.infer<typeof reviewSchema>,
): Promise<Prisma.ReviewWhereInput> {
  const attestations = await getAttestationTargetBulk(searchBy.attestation);

  return {
    id: { in: searchBy.ids },
    subject: { in: searchBy.subject, mode: 'insensitive' },
    author: { in: searchBy.author, mode: 'insensitive' },
    archived: searchBy.archived,
    score: {
      in: searchBy?.score?.map((x) => Score[x]),
    },
    OR: attestations?.map((x) => ({
      account: { equals: x.account, mode: 'insensitive' },
      service: { equals: x.service, mode: 'insensitive' },
    })),
  };
}

export type ReviewSubjectMap<Stats> = {
  byAddress: Partial<Record<Address, Stats>>;
  byAttestation: Partial<Record<string, Partial<Record<string, Stats>>>>;
  total?: Stats;
};

export function reviewSubjectMapBuilder<
  T,
  R extends Prisma.ReviewGetPayload<{
    select: { subject: true; account: true; service: true };
  }>,
>(rows: R[], f: (r: R) => T): ReviewSubjectMap<T> {
  const output: ReviewSubjectMap<T> = {
    byAddress: {},
    byAttestation: {},
  };

  for (const row of rows) {
    if (isValidAddress(row.subject)) {
      output.byAddress[row.subject] = f(row);
    } else {
      const byService = (output.byAttestation[row.service] ??= {});
      byService[row.account] ??= f(row);
    }
  }

  return output;
}
