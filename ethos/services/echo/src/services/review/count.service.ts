import { type z } from 'zod';
import { prisma } from '../../data/db';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';
import { paramsToWhere, reviewSchema } from './review.utils';

type Input = z.infer<typeof reviewSchema>;
type Output = { count: number };

export class ReviewCount extends Service<typeof reviewSchema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, reviewSchema);
  }

  async execute(searchBy: Input): Promise<Output> {
    const where = await paramsToWhere(searchBy);

    const count = await prisma.review.count({ where });

    return { count };
  }
}
