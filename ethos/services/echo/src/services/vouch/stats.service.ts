import { Prisma } from '@prisma/client';
import { formatEther } from 'viem';
import { z } from 'zod';
import { prisma } from '../../data/db';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';

const schema = z.object({
  profileIds: z.number().positive().array(),
});

type Input = z.infer<typeof schema>;
type Output = Partial<
  Record<
    number,
    {
      staked: { received: number; deposited: number; mutual: number };
      balance: { received: number; deposited: number; mutual: number };
      count: { received: number; deposited: number; mutual: number };
      percentile: { received: number; deposited: number; mutual: number };
    }
  >
>;

export class VouchStats extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ profileIds }: Input): Promise<Output> {
    const [subjectStats, authorStats] = await Promise.all([
      getSubjectStats(profileIds),
      getAuthorStats(profileIds),
    ]);

    const output: Output = {};

    for (const id of profileIds) {
      output[id] = {
        staked: {
          received: Number(formatEther(subjectStats[id]?.subject_amount_staked ?? 0n)),
          deposited: Number(formatEther(authorStats[id]?.author_amount_staked ?? 0n)),
          mutual: Number(formatEther(authorStats[id]?.mutual_amount_staked ?? 0n)),
        },
        balance: {
          received: Number(formatEther(subjectStats[id]?.subject_balance ?? 0n)),
          deposited: Number(formatEther(authorStats[id]?.author_balance ?? 0n)),
          mutual: Number(formatEther(authorStats[id]?.mutual_balance ?? 0n)),
        },
        count: {
          received: Number(subjectStats[id]?.count ?? 0),
          deposited: Number(authorStats[id]?.author_count ?? 0),
          mutual: Number(authorStats[id]?.mutual_count ?? 0),
        },
        percentile: {
          received: (subjectStats[id]?.subject_percentile ?? 0) * 100,
          deposited: (authorStats[id]?.author_percentile ?? 0) * 100,
          mutual: (authorStats[id]?.mutual_percentile ?? 0) * 100,
        },
      };
    }

    return output;
  }
}

type AuthorStats = {
  authorProfileId: number;
  author_amount_staked: bigint;
  author_balance: bigint;
  mutual_amount_staked: bigint;
  mutual_balance: bigint;
  author_percentile: number;
  mutual_percentile: number;
  author_count: bigint;
  mutual_count: bigint;
};

async function getAuthorStats(profileIds: number[]): Promise<Partial<Record<number, AuthorStats>>> {
  const rows = await prisma.$queryRaw<AuthorStats[]>`
      WITH common_table AS (
        SELECT
          vouches."authorProfileId",
          SUM(vouches."staked") as author_amount_staked,
          SUM(mutual_vouch."staked") as mutual_amount_staked,
          SUM(vouches."balance") as author_balance,
          SUM(mutual_vouch."balance") as mutual_balance,
          CUME_DIST() OVER (ORDER BY SUM(vouches."staked")) AS author_percentile,
          CUME_DIST() OVER (ORDER BY SUM(mutual_vouch."staked")) AS mutual_percentile,
          COUNT(*) as author_count,
          COUNT(mutual_vouch.id) as mutual_count
        FROM vouches
        LEFT JOIN vouches AS mutual_vouch ON vouches."mutualVouchId" = mutual_vouch.id
        WHERE
          vouches.archived = FALSE
        GROUP BY
          vouches."authorProfileId"
      )

      SELECT
        "authorProfileId",
        author_amount_staked,
        author_balance,
        author_percentile,
        mutual_amount_staked,
        mutual_balance,
        mutual_percentile,
        author_count,
        mutual_count
      FROM
        common_table
      WHERE "authorProfileId" in (${Prisma.join(profileIds)})
    `;

  const output: Record<number, AuthorStats> = {};

  for (const row of rows) {
    output[row.authorProfileId] = row;
  }

  return output;
}

type SubjectStats = {
  subjectProfileId: number;
  subject_amount_staked: bigint;
  subject_balance: bigint;
  subject_percentile: number;
  count: bigint;
};

async function getSubjectStats(
  profileIds: number[],
): Promise<Partial<Record<number, SubjectStats>>> {
  const rows = await prisma.$queryRaw<SubjectStats[]>`
      WITH common_table AS (
        SELECT
          vouches."subjectProfileId",
          SUM(vouches."staked") as subject_amount_staked,
          SUM(vouches."balance") as subject_balance,
          CUME_DIST() OVER (ORDER BY SUM(vouches."staked")) AS subject_percentile,
          COUNT(*) as count
        FROM
          vouches
        WHERE
          vouches.archived = FALSE
        GROUP BY
          vouches."subjectProfileId"
      )

      SELECT
        "subjectProfileId",
        subject_amount_staked,
        subject_balance,
        subject_percentile,
        count
      FROM
        common_table
      WHERE "subjectProfileId" in (${Prisma.join(profileIds)})
    `;

  const output: Record<number, SubjectStats> = {};

  for (const row of rows) {
    output[row.subjectProfileId] = row;
  }

  return output;
}
