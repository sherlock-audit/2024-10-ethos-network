import { z } from 'zod';
import { MarketData } from '../../data/market/index.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

const schema = z.object({
  profileId: validators.profileId,
  window: z.enum(['1D', '7D', '1M', '1Y', 'All']).optional().default('7D'),
});

type Input = z.infer<typeof schema>;
type Output = Awaited<ReturnType<typeof MarketData.getMarketPriceHistory>>;

export class MarketPriceHistoryService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ profileId, window }: Input): Promise<Output> {
    const windowStartDate = getStartDateFromWindow(window);

    return await MarketData.getMarketPriceHistory(profileId, windowStartDate);
  }
}

function getStartDateFromWindow(window: z.infer<typeof schema>['window']): Date {
  const now = new Date();
  switch (window) {
    case '1D':
      return new Date(now.setDate(now.getDate() - 1));
    case undefined:
    case '7D':
      return new Date(now.setDate(now.getDate() - 7));
    case '1M':
      return new Date(now.setMonth(now.getMonth() - 1));
    case '1Y':
      return new Date(now.setFullYear(now.getFullYear() - 1));
    case 'All':
      return new Date(0); // Returns the earliest possible date
    default:
      throw new Error('Invalid window');
  }
}
