import { Score } from '@ethos/blockchain-manager';
import { fromUserKey } from '@ethos/domain';
import { isValidAddress } from '@ethos/helpers';
import { Prisma } from '@prisma/client';
import { type Address } from 'viem';
import { z } from 'zod';
import { prisma } from '../../data/db';
import { user } from '../../data/user/lookup';
import {
  AttestationNotFoundError,
  getAttestationTarget,
} from '../../data/user/lookup/attestation-target';
import { Service } from '../service.base';
import { ServiceError } from '../service.error';
import { type AnyRecord } from '../service.types';
import { validators } from '../service.validator';
import { reviewSubjectMapBuilder, type ReviewSubjectMap } from './review.utils';

const schema = z.object({
  target: validators.ethosUserKey(true),
});

type ReviewStatsData = {
  received: number;
  averageReviewForUser: number;
  positiveReviewPercentage: number;
  percentile: number;
};

type Input = z.infer<typeof schema>;
type Output = ReviewSubjectMap<ReviewStatsData>;

export class ReviewStats extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute(input: Input): Promise<Output> {
    const whereConditions: Prisma.Sql[] = [];
    let target = fromUserKey(input.target, true);

    if ('service' in target && 'username' in target) {
      try {
        target = await getAttestationTarget(target);
      } catch (err) {
        if (!(err instanceof AttestationNotFoundError)) {
          this.logger.warn({ err }, 'Failed to get attestation target');
        }

        throw ServiceError.NotFound('Attestation account not found');
      }
    }
    const profile = await user.getProfile(target);

    if (profile) {
      const [profileAddresses, attestations] = await Promise.all([
        user.getAddresses(target),
        user.getAttestations(profile.id),
      ]);

      // if profile found, look up by all addresses and attestations
      for (const address of profileAddresses.allAddresses) {
        whereConditions.push(Prisma.sql`(subject = ${address})`);
      }

      for (const attestation of attestations) {
        whereConditions.push(
          Prisma.sql`(account = ${attestation.account} and service = ${attestation.service})`,
        );
      }
    } else {
      // if no profile found, look up by address or attestation
      if ('address' in target) {
        whereConditions.push(Prisma.sql`(subject = ${target.address})`);
      }
      if ('service' in target && 'account' in target) {
        whereConditions.push(
          Prisma.sql`(account = ${target.account} and service = ${target.service})`,
        );
      }
      if ('profileId' in target) {
        throw ServiceError.NotFound('Profile not found');
      }
    }

    if (whereConditions.length === 0) {
      throw ServiceError.BadRequest('No filter parameters');
    }

    type Row = {
      subject: Address;
      account: string;
      service: string;
      total: bigint;
      total_positive: bigint;
      avg_score: Prisma.Decimal;
      percentile: number;
    };
    const rows = await prisma.$queryRaw<Row[]>`
    -- calculate CUME_DIST on the unfiltered data
    WITH common_table AS (
      SELECT
        subject,
        account,
        service,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE score = ${Score.positive}) AS total_positive,
        AVG(score - 1) AS avg_score,
        CUME_DIST() OVER (ORDER BY AVG(score - 1)) AS percentile
        FROM reviews
        WHERE
          archived = FALSE
        GROUP BY
          subject,
          account,
          service
    )

    SELECT
      subject,
      account,
      service,
      total,
      total_positive,
      avg_score,
      percentile
    FROM
      common_table
    WHERE (${Prisma.join(whereConditions, 'or')})

    `;

    const output: Output = reviewSubjectMapBuilder(rows, (row) => ({
      received: Number(row.total),
      averageReviewForUser: row.avg_score.toNumber(),
      positiveReviewPercentage: (Number(row.total_positive) / Number(row.total)) * 100,
      percentile: row.percentile * 100,
    }));

    output.total = aggregateStats(output);

    return {
      ...output,
    };
  }
}

function aggregateStats(output: Output): Output['total'] {
  const stats: ReviewStatsData[] = [];

  for (const key in output.byAddress) {
    if (isValidAddress(key)) {
      const stat = output.byAddress[key];

      if (stat) {
        stats.push(stat);
      }
    }
  }

  for (const key in output.byAttestation) {
    const service = output.byAttestation[key];

    for (const account in service) {
      const stat = service[account];

      if (stat) {
        stats.push(stat);
      }
    }
  }

  // sum received
  const received = stats.reduce((sum, stat) => sum + stat.received, 0);
  // aggregate averages by (avg * count) / total
  const averageReviewForUser =
    stats.reduce((sum, stat) => sum + stat.averageReviewForUser * stat.received, 0) / received;
  // aggregate positive review percentages by (percent * count) / total
  const positiveReviewPercentage =
    stats.reduce((sum, stat) => sum + stat.positiveReviewPercentage * stat.received, 0) / received;
  // show the user's best percentile rank
  // TODO once we support unified ethos IDs, we can calculate percentile across both attestations and addresses
  const percentile = Math.max(...stats.map((stat) => stat.percentile));

  return {
    received,
    averageReviewForUser,
    positiveReviewPercentage,
    percentile,
  };
}
