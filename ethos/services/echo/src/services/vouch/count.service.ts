import { type z } from 'zod';
import { prisma } from '../../data/db';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';
import { paramsToWhere, vouchSchema } from './vouch.utils';

type Input = z.infer<typeof vouchSchema>;
type Output = { count: number };

export class VouchCount extends Service<typeof vouchSchema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, vouchSchema);
  }

  async execute(searchBy: Input): Promise<Output> {
    const where = paramsToWhere(searchBy);

    const count = await prisma.vouch.count({ where });

    return { count };
  }
}
