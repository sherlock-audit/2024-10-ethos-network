import { type Attestation } from '@ethos/blockchain-manager';
import { X_SERVICE } from '@ethos/domain';
import { type PaginatedResponse } from '@ethos/helpers';
import { type z } from 'zod';
import { prisma } from '../../data/db';
import {
  convertTwitterProfile,
  type PrismaTwitterProfileCacheSimplified,
} from '../../data/user/twitter-profile';
import { Service } from '../service.base';
import { ServiceError } from '../service.error';
import { type AnyRecord } from '../service.types';
import { validators } from '../service.validator';
import { AttestationQueryService } from './attestation.service';
import { attestationSchema } from './attestation.utils';

const schema = attestationSchema.merge(validators.paginationSchema({ maxLimit: 100 }));

type TwitterProfileMap = Map<string, PrismaTwitterProfileCacheSimplified>;

type Input = z.infer<typeof schema>;
type Output = PaginatedResponse<{
  attestation: Attestation;
  extra: PrismaTwitterProfileCacheSimplified;
}>;

export class ExtendedAttestationsQueryService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute(searchBy: Input): Promise<Output> {
    const attestations = await this.useService(AttestationQueryService).run(searchBy);

    const twitterProfiles = await this.getTwitterProfiles(attestations.values);

    const result: Output = {
      total: attestations.total,
      limit: attestations.limit,
      offset: attestations.offset,
      values: attestations.values.map((attestation) => {
        const extra = twitterProfiles.get(attestation.account);

        if (!extra) {
          throw ServiceError.NotFound('Attestation details not found');
        }

        return {
          attestation,
          extra,
        };
      }),
    };

    return result;
  }

  private async getTwitterProfiles(attestations: Attestation[]): Promise<TwitterProfileMap> {
    const accounts = attestations.filter((a) => a.service === X_SERVICE).map((a) => a.account);

    const xAttestationsMap = new Map<string, PrismaTwitterProfileCacheSimplified>();

    if (!accounts.length) {
      return xAttestationsMap;
    }

    const twitterProfiles = await prisma.twitterProfileCache.findMany({
      where: {
        id: {
          in: accounts,
        },
      },
    });

    for (const profile of twitterProfiles) {
      xAttestationsMap.set(profile.id, convertTwitterProfile.toSimplified(profile));
    }

    return xAttestationsMap;
  }
}
