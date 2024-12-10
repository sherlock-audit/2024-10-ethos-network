import { z } from 'zod';
import { MarketData } from '../../data/market/index.js';
import { getActor } from '../activity/utility.js';
import { Service } from '../service.base.js';
import { ServiceError } from '../service.error.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';
import { convertToMarketProfile, type MarketProfile } from './market-profile.js';

const schema = z.object({
  profileId: validators.profileId,
});

type Input = z.infer<typeof schema>;
type Output = MarketProfile;

export class MarketInfoService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ profileId }: Input): Promise<Output> {
    const [marketInfo, actor] = await Promise.all([
      MarketData.getMarketInfo(profileId),
      getActor({ profileId }),
    ]);

    if (!marketInfo || !actor) {
      throw ServiceError.NotFound(`No market for ${profileId}`);
    }

    return convertToMarketProfile(marketInfo, actor);
  }
}
