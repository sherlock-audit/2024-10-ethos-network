import { type Prisma } from '@prisma-pg/client';

export type PrismaTwitterProfileCache = Prisma.TwitterProfileCacheGetPayload<{
  select: {
    id: true;
    username: true;
    name: true;
    avatar: true;
    biography: true;
    website: true;
    followersCount: true;
    joinedAt: true;
    isBlueVerified: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

export type PrismaTwitterProfileCacheSimplified = Pick<
  PrismaTwitterProfileCache,
  | 'id'
  | 'username'
  | 'name'
  | 'avatar'
  | 'biography'
  | 'website'
  | 'followersCount'
  | 'isBlueVerified'
> & {
  joinedAt?: number;
};

function toSimplified(item: PrismaTwitterProfileCache): PrismaTwitterProfileCacheSimplified {
  return {
    id: item.id,
    username: item.username,
    name: item.name,
    avatar: item.avatar,
    biography: item.biography,
    website: item.website,
    followersCount: item.followersCount,
    isBlueVerified: item.isBlueVerified,
    joinedAt: item.joinedAt ? item.joinedAt.getTime() : undefined,
  };
}

export const convertTwitterProfile = {
  toSimplified,
};
