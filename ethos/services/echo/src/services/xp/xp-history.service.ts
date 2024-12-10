import { fromUserKey } from '@ethos/domain';
import { type PaginatedResponse } from '@ethos/helpers';
import { type Prisma } from '@prisma-pg/client';
import { z } from 'zod';
import { prisma } from '../../data/db.js';
import { user } from '../../data/user/lookup/index.js';
import { Service } from '../service.base.js';
import { ServiceError } from '../service.error.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

export type XpPointsHistory = Prisma.XpPointsHistoryGetPayload<{
  select: {
    id: true;
    profileId: true;
    type: true;
    points: true;
    metadata: true;
    createdAt: true;
  };
}>;

export const xpHistorySchema = z
  .object({
    userkey: validators.ethosUserKey(),
  })
  .merge(validators.paginationSchema());

export class XpHistoryService extends Service<
  typeof xpHistorySchema,
  PaginatedResponse<XpPointsHistory>
> {
  validate(params: AnyRecord): z.infer<typeof xpHistorySchema> {
    return this.validator(params, xpHistorySchema);
  }

  async execute({
    userkey,
    pagination,
  }: z.infer<typeof xpHistorySchema>): Promise<PaginatedResponse<XpPointsHistory>> {
    const { limit = 10, offset = 0 } = pagination ?? {};

    const profileId = await user.getProfileId(fromUserKey(userkey));

    if (!profileId) {
      throw ServiceError.NotFound('Profile not found');
    }

    const [total, values] = await Promise.all([
      prisma.xpPointsHistory.count({
        where: { profileId },
      }),
      prisma.xpPointsHistory.findMany({
        where: { profileId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);

    return {
      total,
      limit,
      offset,
      values,
    };
  }
}
