import { keyBy } from 'lodash-es';
import { z } from 'zod';
import { MarketData } from '../../data/market/index.js';
import { getActors } from '../activity/utility.js';
import { Service } from '../service.base.js';
import { ServiceError } from '../service.error.js';
import { type AnyRecord } from '../service.types.js';
import { convertToMarketProfile, type MarketProfile } from './market-profile.js';

const bulkSchema = z.object({
  profileIds: z.coerce.number().positive().int().array(),
});

type Input = z.infer<typeof bulkSchema>;
type Output = MarketProfile[];

export class MarketInfoBulkService extends Service<typeof bulkSchema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, bulkSchema);
  }

  async execute({ profileIds }: Input): Promise<Output> {
    const [markets, actors] = await Promise.all([
      MarketData.getMarketsByIds(profileIds),
      getActors(profileIds.map((profileId) => ({ profileId }))),
    ]);

    const actorsByProfileId = keyBy(actors, 'profileId');

    return markets.map((market) => {
      const actor = actorsByProfileId[market.profileId];

      if (!actor) {
        throw ServiceError.InternalServerError(
          `No ethos user profile for market ${market.profileId}`,
        );
      }

      return convertToMarketProfile(market, actor);
    });
  }
}
