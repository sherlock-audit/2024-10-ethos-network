import { type ProfileId } from '@ethos/blockchain-manager';
import { formatEther } from 'viem';
import { z } from 'zod';
import { prisma } from '../../data/db';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';

const schema = z.object({
  profileIds: z.number().positive().array(),
});

type Input = z.infer<typeof schema>;
type Output = Record<
  ProfileId,
  {
    rewards: number;
    lifetime: number;
  }
>;

type RewardsStats = {
  profileId: number;
  rewards: string;
  lifetime: string;
};

export class VouchRewards extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ profileIds }: Input): Promise<Output> {
    const rewardsStats = await this.getRewardsStats(profileIds);

    const output: Output = {};

    for (const id of profileIds) {
      output[id] = {
        rewards: Number(formatEther(BigInt(rewardsStats[id]?.rewards ?? '0'))),
        lifetime: Number(formatEther(BigInt(rewardsStats[id]?.lifetime ?? '0'))),
      };
    }

    return output;
  }

  private async getRewardsStats(
    profileIds: number[],
  ): Promise<Partial<Record<number, RewardsStats>>> {
    const rows = await prisma.escrow.findMany({
      where: {
        profileId: { in: profileIds },
      },
      select: {
        profileId: true,
        balance: true,
        lifetime: true,
      },
    });

    const output: Record<number, RewardsStats> = {};

    for (const row of rows) {
      output[row.profileId] = {
        profileId: row.profileId,
        rewards: row.balance,
        lifetime: row.lifetime,
      };
    }

    return output;
  }
}
