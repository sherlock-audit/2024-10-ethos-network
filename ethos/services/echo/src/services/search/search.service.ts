import { type EthosUserTarget, type ActivityActor, X_SERVICE } from '@ethos/domain';
import { type PaginatedResponse } from '@ethos/helpers';
import { type Prisma, type TwitterProfileCache } from '@prisma/client';
import { getAddress, type Address } from 'viem';
import { z } from 'zod';
import { cachedOperation, createLRUCache } from '../../common/cache/lru.cache';
import { type PrismaLiteProfile } from '../../data/conversion';
import { prisma } from '../../data/db';
import { prismaProfileLiteSelectClause } from '../../data/user/lookup/profile';
import { SharedActivity } from '../activity/shared.activity';
import { type AnyRecord } from '../service.types';
import { validators } from '../service.validator';

const querySchema = z.object({
  query: z.string().optional(),
});

const schema = querySchema.merge(validators.paginationSchema());

type Input = z.infer<typeof schema>;
type Output = PaginatedResponse<ActivityActor>;

const profilesCache = createLRUCache<{ profiles: PrismaLiteProfile[]; count: number }>();
const twitterProfilesCache = createLRUCache<{
  twitterProfiles: TwitterProfileCache[];
  count: number;
}>();
const ensCache = createLRUCache<{ addresses: Address[]; count: number }>();
const actorCache = createLRUCache<ActivityActor>(1);

export class SearchService extends SharedActivity<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  private async cachedSearchProfiles(
    input: Input,
  ): Promise<{ profiles: PrismaLiteProfile[]; count: number }> {
    return await cachedOperation(
      'profilesCache',
      profilesCache,
      input,
      this.searchProfiles.bind(this),
    );
  }

  private async cachedSearchTwitterProfiles(
    input: Input,
  ): Promise<{ twitterProfiles: TwitterProfileCache[]; count: number }> {
    return await cachedOperation(
      'twitterProfilesCache',
      twitterProfilesCache,
      input,
      this.searchTwitterProfiles.bind(this),
    );
  }

  private async cachedSearchEns(input: Input): Promise<{ addresses: Address[]; count: number }> {
    return await cachedOperation('ensCache', ensCache, input, this.searchEns.bind(this));
  }

  private async cachedGetActor(target: EthosUserTarget): Promise<ActivityActor> {
    return await cachedOperation('actorCache', actorCache, target, this.getActor.bind(this));
  }

  async execute({ query, pagination }: Input): Promise<Output> {
    if (!query) {
      return {
        values: [],
        total: 0,
        limit: pagination.limit,
        offset: pagination.offset,
      };
    }
    // retrieve all profiles and reviews including addresses or accounts including this querystring
    const [
      { profiles, count: profilesCount },
      { twitterProfiles, count: twitterProfilesCount },
      { addresses, count: ensCount },
    ] = await Promise.all([
      this.cachedSearchProfiles({ query, pagination }),
      this.cachedSearchTwitterProfiles({ query, pagination }),
      this.cachedSearchEns({ query, pagination }),
    ]);
    // translate the results into ethos user targets
    const targets: EthosUserTarget[] = [
      ...profiles.map((profile) => ({ profileId: profile.id })),
      ...twitterProfiles.map((twitterProfile) => ({
        service: X_SERVICE,
        account: twitterProfile.id,
      })),
      ...addresses.map((address) => ({ address })),
    ];
    // retrieve actor info (name, avatar, profileId, etc) for the targets
    const actors = await Promise.all(
      targets.map(async (target) => await this.cachedGetActor(target)),
    );

    const uniqueActors = Array.from(
      actors
        .reduce<
          Map<string, ActivityActor>
        >((map, actor) => map.set(actor.userkey, actor), new Map())
        .values(),
    );

    return {
      values: uniqueActors,
      total: profilesCount + twitterProfilesCount + ensCount,
      limit: pagination.limit,
      offset: pagination.offset,
    };
  }

  private async searchProfiles({
    query,
    pagination,
  }: Input): Promise<{ profiles: PrismaLiteProfile[]; count: number }> {
    const where: Prisma.ProfileWhereInput = {
      OR: [{ ProfileAddress: { some: { address: { contains: query, mode: 'insensitive' } } } }],
      archived: false,
    };

    const [profiles, count] = await Promise.all([
      prisma.profile.findMany({
        select: prismaProfileLiteSelectClause,
        where,
        skip: pagination.offset,
        take: pagination.limit,
      }),
      prisma.profile.count({
        where,
      }),
    ]);

    return {
      profiles,
      count,
    };
  }

  private async searchTwitterProfiles({
    query,
    pagination,
  }: Input): Promise<{ twitterProfiles: TwitterProfileCache[]; count: number }> {
    const where: Prisma.TwitterProfileCacheWhereInput = {
      OR: [
        { username: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
      ],
    };

    const [twitterProfiles, count] = await Promise.all([
      prisma.twitterProfileCache.findMany({
        where,
        skip: pagination.offset,
        take: pagination.limit,
      }),
      prisma.twitterProfileCache.count({
        where,
      }),
    ]);

    return {
      twitterProfiles,
      count,
    };
  }

  private async searchEns({
    query,
    pagination,
  }: Input): Promise<{ addresses: Address[]; count: number }> {
    const where: Prisma.EnsCacheWhereInput = { ensName: { contains: query, mode: 'insensitive' } };

    const [ens, count] = await Promise.all([
      prisma.ensCache.findMany({
        where,
        skip: pagination.offset,
        take: pagination.limit,
      }),
      prisma.ensCache.count({
        where,
      }),
    ]);

    const addresses = ens.map((ens: { address: string }) => getAddress(ens.address));

    return {
      addresses,
      count,
    };
  }
}
