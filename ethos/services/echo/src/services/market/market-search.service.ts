import { notEmpty } from '@ethos/helpers';
import { keyBy } from 'lodash-es';
import { z } from 'zod';
import { MarketData } from '../../data/market/index.js';
import { getActors } from '../activity/utility.js';
import { SearchService } from '../search/search.service.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { convertToMarketProfile, type MarketProfile } from './market-profile.js';

const schema = z.object({
  query: z.string().optional(),
});

type Input = z.infer<typeof schema>;
type Output = MarketProfile[];

export class MarketSearchService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ query }: Input): Promise<Output> {
    if (query) {
      return await this.searchMarkets(query);
    }

    return await this.getAllMarkets();
  }

  async getAllMarkets(): Promise<MarketProfile[]> {
    const markets = await MarketData.getAllMarkets();
    const actors = await getActors(markets.map((market) => ({ profileId: market.profileId })));
    const actorsByProfileId = keyBy(actors, 'profileId');

    return markets
      .map((market) => {
        const actor = actorsByProfileId[market.profileId];

        if (!actor) {
          this.logger.error(
            { data: { profileId: market.profileId } },
            'get_all_markets.missing_actor',
          );

          return null;
        }

        return convertToMarketProfile(market, actor);
      })
      .filter(notEmpty);
  }

  async searchMarkets(query: string): Promise<MarketProfile[]> {
    const { values: actors } = await this.useService(SearchService).run({
      query,
      pagination: { limit: 50, offset: 0 },
    });

    const actorsByProfileId = keyBy(actors, 'profileId');
    const profileIds = actors
      .filter((a) => Boolean(a.profileId))
      .map((a) => a.profileId)
      .filter(notEmpty);

    const markets = await MarketData.getMarketsByIds(profileIds);

    return markets.map((market) =>
      convertToMarketProfile(market, actorsByProfileId[market.profileId]),
    );
  }
}
