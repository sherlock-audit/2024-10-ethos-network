import { z } from 'zod';
import { TwitterScraper } from '../../common/net/twitter/twitter-scraper.client.js';
import { prisma } from '../../data/db.js';
import {
  convertTwitterProfile,
  type PrismaTwitterProfileCache,
  type PrismaTwitterProfileCacheSimplified,
} from '../../data/user/twitter-profile.js';
import { Service } from '../service.base.js';
import { ServiceError } from '../service.error.js';
import { type AnyRecord } from '../service.types.js';

const schema = z.union([
  z.object({
    id: z.string(),
  }),
  z.object({
    username: z.string(),
  }),
]);

type Input = z.infer<typeof schema>;
type Output = PrismaTwitterProfileCacheSimplified;

const twitterScraper = new TwitterScraper();

export class TwitterUser extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute(params: Input): Promise<Output> {
    const profile =
      'id' in params ? await this.getById(params.id) : await this.getByUsername(params.username);

    if (!profile) {
      throw ServiceError.NotFound('Twitter profile not found', {
        fields: ['username'],
      });
    }

    return convertTwitterProfile.toSimplified(profile);
  }

  private async getById(id: string): Promise<PrismaTwitterProfileCache | null> {
    return await prisma.twitterProfileCache.findUnique({
      where: {
        id,
      },
    });
  }

  private async getByUsername(username: string): Promise<PrismaTwitterProfileCache | null> {
    return await twitterScraper.getProfile(username);
  }
}
