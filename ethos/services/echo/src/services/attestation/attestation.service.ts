import { type Attestation } from '@ethos/blockchain-manager';
import { type PaginatedResponse } from '@ethos/helpers';
import { type Prisma } from '@prisma-pg/client';
import { type z } from 'zod';
import { convert } from '../../data/conversion.js';
import { prisma } from '../../data/db.js';
import { Service } from '../service.base.js';
import { ServiceError } from '../service.error.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';
import { attestationSchema } from './attestation.utils.js';

const schema = attestationSchema.merge(validators.paginationSchema({ maxLimit: 100 }));

type Input = z.infer<typeof schema>;
type Output = PaginatedResponse<Attestation>;

export class AttestationQueryService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute(searchBy: Input): Promise<Output> {
    if (!searchBy.attestationHashes && !searchBy.profileIds) {
      throw ServiceError.BadRequest('Must specify either attestationHashes or profileIds', {
        fields: ['attestationHashes', 'profileIds'],
      });
    }
    const where = this.paramsToWhere(searchBy);
    const [count, data] = await Promise.all([
      prisma.attestation.count({ where }),
      prisma.attestation.findMany({
        where,
        orderBy: searchBy.orderBy ?? { createdAt: 'desc' },
        take: searchBy.pagination.limit,
        skip: searchBy.pagination.offset,
      }),
    ]);

    return {
      values: data.map(convert.toAttestationFromPrisma),
      limit: searchBy.pagination.limit,
      offset: searchBy.pagination.offset,
      total: count,
    };
  }

  private paramsToWhere(
    searchBy: Omit<Input, 'orderBy' | 'pagination'>,
  ): Prisma.AttestationWhereInput {
    return {
      hash: { in: searchBy.attestationHashes },
      profileId: { in: searchBy.profileIds },
      archived: searchBy.archived,
    };
  }
}
