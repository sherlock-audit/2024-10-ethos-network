import { type LiteProfile } from '@ethos/domain';
import { type PaginatedResponse } from '@ethos/helpers';
import { type Prisma } from '@prisma/client';
import { z } from 'zod';
import { convert } from '../../data/conversion';
import { prisma } from '../../data/db';
import { prismaProfileLiteSelectClause } from '../../data/user/lookup/profile';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';
import { validators } from '../service.validator';

const baseSchema = z.object({
  archived: z.boolean().optional(),
});

const schema = baseSchema.merge(validators.paginationSchema({ maxLimit: 100 }));

type RecentProfilesQueryParams = z.infer<typeof schema>;

export class RecentProfilesQuery extends Service<typeof schema, PaginatedResponse<LiteProfile>> {
  validate(params: AnyRecord): RecentProfilesQueryParams {
    return this.validator(params, schema);
  }

  async execute(searchBy: RecentProfilesQueryParams): Promise<PaginatedResponse<LiteProfile>> {
    const where: Prisma.ProfileWhereInput = {
      archived: searchBy.archived,
    };

    const [count, data] = await Promise.all([
      prisma.profile.count({ where }),
      prisma.profile.findMany({
        select: prismaProfileLiteSelectClause,
        where,
        orderBy: { createdAt: 'desc' },
        take: searchBy.pagination.limit,
        skip: searchBy.pagination.offset,
      }),
    ]);

    const profiles = convert.toLiteProfiles(data);

    return {
      values: profiles,
      limit: searchBy.pagination.limit,
      offset: searchBy.pagination.offset,
      total: count,
    };
  }
}
