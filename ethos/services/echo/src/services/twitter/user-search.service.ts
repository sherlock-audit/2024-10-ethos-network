import { notEmpty } from '@ethos/helpers';
import { z } from 'zod';
import { prisma } from '../../data/db';
import {
  convertTwitterProfile,
  type PrismaTwitterProfileCacheSimplified,
} from '../../data/user/twitter-profile';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';
import { TwitterUser } from './user.service';

const schema = z.object({
  search: z.string(),
  limit: z.preprocess((v) => Number(v), z.number().max(50).optional().default(10)),
});

type Input = z.infer<typeof schema>;
type Output = PrismaTwitterProfileCacheSimplified[];

export class TwitterUserSearch extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  // TODO: at some point we should check if we can add the actual search using
  // Twitter Scraper or official API. For now, the scraper's searchProfiles
  // method is broken.
  async execute({ search, limit }: Input): Promise<Output> {
    const [exactMatch, partialMatch] = await Promise.all([
      // Search for exact match, this makes request to Twitter API using scraper
      this.useService(TwitterUser)
        .run({ username: search })
        .catch(() => null),
      // Search for existing cached Twitter profiles. Most likely, it's not that
      // useful for new users but might be useful if the profile was previously
      // fetched (either someone reviewed it or it was previously fetched by
      // Twitter Chrome extension).
      prisma.twitterProfileCache.findMany({
        where: {
          username: {
            contains: search,
            mode: 'insensitive',
          },
        },
        take: limit,
      }),
    ]);

    return [
      exactMatch,
      ...partialMatch
        .map((profile) => convertTwitterProfile.toSimplified(profile))
        .filter((u) => u.id !== exactMatch?.id),
    ].filter(notEmpty);
  }
}
