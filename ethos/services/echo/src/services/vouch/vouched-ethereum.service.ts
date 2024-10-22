import { type z } from 'zod';
import { convert } from '../../data/conversion';
import { prisma } from '../../data/db';
import { Service } from '../service.base';
import { paramsToWhere, vouchSchema } from './vouch.utils';

const schema = vouchSchema.omit({ archived: true });

type Input = z.infer<typeof schema>;
type Output = { vouched: bigint };

export class VouchedEthereum extends Service<typeof schema, Output> {
  validate(params: any): Input {
    return this.validator(params, schema);
  }

  async execute(searchBy: Input): Promise<Output> {
    const where = paramsToWhere(searchBy);

    const result = await prisma.vouch.aggregate({
      _sum: { staked: true },
      where: { ...where, archived: false, unvouchedAt: null },
    });

    const staked = result._sum.staked ? convert.toBigint(result._sum.staked) : 0n;

    return { vouched: staked };
  }
}
