import { type Fees } from '@ethos/blockchain-manager';
import { duration } from '@ethos/helpers';
import { z } from 'zod';
import { cachedOperation, createLRUCache } from '../../common/cache/lru.cache';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';

const schema = z.object({});

type Input = z.infer<typeof schema>;
type Output = Fees;

const feesCache = createLRUCache<Fees>(duration(12, 'hours').toMilliseconds());

export class FeesInfoService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute(): Promise<Output> {
    return await cachedOperation(
      'feesCache',
      feesCache,
      'allFees',
      async () => await this.blockchainManager.getAllFees(),
    );
  }
}
