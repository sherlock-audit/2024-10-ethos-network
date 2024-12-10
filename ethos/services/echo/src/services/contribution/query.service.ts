import { type ContributionBundleModel } from '@ethos/domain';
import { z } from 'zod';
import { prisma } from '../../data/db.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';
import { DEFAULT_INCLUDE, prismaToContribution } from './utils.js';

const contributionQuerySchema = z.object({
  profileId: validators.profileId,
  status: z.enum(['PENDING', 'COMPLETED', 'SKIPPED']).array(),
});

type Input = z.infer<typeof contributionQuerySchema>;
type Output = ContributionBundleModel[];

export class ContributionQueryService extends Service<typeof contributionQuerySchema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, contributionQuerySchema);
  }

  async execute({ profileId, status }: Input): Promise<Output> {
    const contributionBundles = await prisma.contributionBundle.findMany({
      where: {
        profileId,
        expireAt: { gt: new Date() },
        Contribution: {
          some: {
            status: { in: status },
          },
        },
      },
      include: {
        Contribution: {
          where: {
            status: { in: status },
          },
          include: DEFAULT_INCLUDE,
          orderBy: { id: 'asc' },
        },
      },
    });

    return contributionBundles.map((x) => ({
      id: x.id,
      contributions: x.Contribution.map(prismaToContribution),
    }));
  }
}
