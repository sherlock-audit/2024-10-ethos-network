import { type z } from 'zod';
import { convert } from '../../data/conversion.js';
import { prisma } from '../../data/db.js';
import { Service } from '../service.base.js';
import { paramsToWhere, vouchSchema } from './vouch.utils.js';

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
