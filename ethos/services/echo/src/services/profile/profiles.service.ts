import { type LiteProfile } from '@ethos/domain';
import { duration, type PaginatedResponse } from '@ethos/helpers';
import { type Prisma } from '@prisma-pg/client';
import { z } from 'zod';
import { cachedOperation, createLRUCache } from '../../common/cache/lru.cache.js';
import { convert } from '../../data/conversion.js';
import { prisma } from '../../data/db.js';
import { prismaProfileLiteSelectClause } from '../../data/user/lookup/profile.js';
import { Service } from '../service.base.js';
import { ServiceError } from '../service.error.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

const MAX_REQUESTED_PROFILES = 100;
const ONE_MINUTE = duration(1, 'minute').toMilliseconds();

const baseSchema = z.object({
  ids: z.array(validators.profileId).max(MAX_REQUESTED_PROFILES).optional(),
  archived: z.boolean().optional(),
  addresses: z.array(validators.address).max(MAX_REQUESTED_PROFILES).optional(),
  useCache: z.boolean().optional().default(true),
});

const schema = baseSchema.merge(validators.paginationSchema({ maxLimit: MAX_REQUESTED_PROFILES }));

type ProfileQueryParams = z.infer<typeof schema>;
const profileCache = createLRUCache<PaginatedResponse<LiteProfile>>(ONE_MINUTE);

export class ProfileQuery extends Service<typeof schema, PaginatedResponse<LiteProfile>> {
  validate(params: AnyRecord): ProfileQueryParams {
    return this.validator(params, schema);
  }

  async execute(searchBy: ProfileQueryParams): Promise<PaginatedResponse<LiteProfile>> {
    if (searchBy.useCache) {
      return await cachedOperation(
        'profileCache',
        profileCache,
        searchBy,
        async () => await this.fetch(searchBy),
      );
    }

    return await this.fetch(searchBy);
  }

  async fetch(searchBy: ProfileQueryParams): Promise<PaginatedResponse<LiteProfile>> {
    if (!searchBy.ids?.length && !searchBy.addresses?.length) {
      throw ServiceError.BadRequest('Must specify either ids or addresses', {
        fields: ['ids', 'addresses'],
      });
    }

    const where = this.paramsToWhere(searchBy);
    const limit = searchBy.pagination.limit;
    const offset = searchBy.pagination.offset;

    const [count, data] = await Promise.all([
      prisma.profile.count({ where }),
      prisma.profile.findMany({
        select: prismaProfileLiteSelectClause,
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);

    const profiles = convert.toLiteProfiles(data);

    return {
      values: profiles,
      limit,
      offset,
      total: count,
    };
  }

  private paramsToWhere(
    searchBy: Omit<ProfileQueryParams, 'orderBy' | 'pagination'>,
  ): Prisma.ProfileWhereInput {
    return {
      id: { in: searchBy.ids },
      archived: searchBy.archived,
      ProfileAddress: searchBy.addresses
        ? {
            some: {
              address: { in: searchBy.addresses, mode: 'insensitive' },
            },
          }
        : undefined,
    };
  }
}
