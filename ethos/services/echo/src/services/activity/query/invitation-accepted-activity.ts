import { type BlockchainEvent, type InvitationAcceptedActivityInfo } from '@ethos/domain';
import { InvitationStatus, Prisma } from '@prisma-pg/client';
import { type Address, getAddress } from 'viem';
import { blockchainManager } from '../../../common/blockchain-manager.js';
import { convert } from '../../../data/conversion.js';
import { prisma } from '../../../data/db.js';
import { user } from '../../../data/user/lookup/index.js';
import { type ActivityQuery, getActor, joinOrEmpty, queryCount } from '../utility.js';
import { activityQuery } from './activity-query.js';

type InvitationAcceptedInfo = Prisma.ProfileGetPayload<{ select: null }> & {
  acceptedProfileId: number;
};

export const invitationAcceptedActivityQuery: ActivityQuery<
  InvitationAcceptedInfo,
  InvitationAcceptedActivityInfo
> = {
  query: async ({ target, direction, ids, currentUserProfileId, orderBy, pagination }) => {
    const whereFilter: Prisma.Sql[] = [];

    if (target) {
      const profileId = await user.getProfileId(target);

      if (profileId === null) return { results: [], totalCount: 0 };

      const userFilters: Prisma.Sql[] = [];

      if (direction === 'author' || direction === undefined) {
        userFilters.push(Prisma.sql`"senderProfileId" = ${profileId}`);
      }

      if (direction === 'subject' || direction === undefined) {
        userFilters.push(Prisma.sql`"acceptedProfileId" = ${profileId}`);
      }

      whereFilter.push(joinOrEmpty(userFilters, ' OR ', '(', ')'));
    }

    if (ids && ids.length > 0) {
      whereFilter.push(Prisma.sql`id in (${Prisma.join(ids)})`);
    }

    whereFilter.push(Prisma.sql`status = ${InvitationStatus.ACCEPTED}::"InvitationStatus"`);

    const where = joinOrEmpty(whereFilter, ' AND ', 'WHERE ');

    const query = Prisma.sql`
      SELECT profiles.*, invitations."statusUpdatedAt"
      FROM profiles
      INNER JOIN invitations on invitations."acceptedProfileId" = profiles.id
      ${where}
    `;

    const results = await activityQuery<InvitationAcceptedInfo>({
      data: {
        query,
        contract: blockchainManager.getContractAddress('profile'),
        id: Prisma.sql`id`,
        timestamp: Prisma.sql`"statusUpdatedAt"`,
      },
      currentUserProfileId,
      orderBy,
      pagination,
    });

    const totalCount = await queryCount(Prisma.sql`
      SELECT COUNT(*)
      FROM profiles
      INNER JOIN invitations on invitations."acceptedProfileId" = profiles.id
      ${where}`);

    return { results, totalCount };
  },
  hydrate: async (results) => {
    const ids = results.map((x) => x.data.id);

    if (ids.length === 0) return [];

    const [events, profileAddresses, attestations] = await Promise.all([
      prisma.profileEvent.findMany({
        where: { profileId: { in: ids } },
        include: {
          event: true,
        },
      }),
      prisma.profileAddress.findMany({
        where: { profileId: { in: ids } },
      }),
      prisma.attestation.findMany({ where: { profileId: { in: ids } } }),
    ]);

    const eventLookup = events.reduce<Partial<Record<number, BlockchainEvent[]>>>((acc, value) => {
      acc[value.profileId] ??= [];
      acc[value.profileId]?.push(convert.toBlockchainEvent(value.event));

      return acc;
    }, {});

    const profileAddressesLookup = profileAddresses.reduce<Partial<Record<number, Address[]>>>(
      (acc, value) => {
        acc[value.profileId] ??= [];
        acc[value.profileId]?.push(getAddress(value.address));

        return acc;
      },
      {},
    );

    const attestationsLookup = attestations.reduce<Partial<Record<number, typeof attestations>>>(
      (acc, value) => {
        acc[value.profileId] ??= [];
        acc[value.profileId]?.push(value);

        return acc;
      },
      {},
    );

    // append activity info for each
    const activities = await Promise.all(
      results.map(async ({ data: profile, metadata }) => {
        const data: InvitationAcceptedActivityInfo['data'] = convert.toProfile(
          {
            ...profile,
            Attestation: attestationsLookup[profile.id] ?? [],
          },
          profileAddressesLookup[profile.id] ?? [],
        );
        const [author, subject] = await Promise.all([
          getActor({ profileId: profile.invitedBy }),
          getActor({ profileId: profile.id }),
        ]);

        const info: InvitationAcceptedActivityInfo = {
          type: 'invitation-accepted',
          data,
          timestamp: data.createdAt,
          votes: metadata.votes,
          replySummary: metadata.replySummary,
          author,
          subject,
          events: eventLookup[data.id] ?? [],
        };

        return info;
      }),
    );

    return activities;
  },
};
