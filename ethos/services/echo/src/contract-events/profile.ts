import { type ProfileId } from '@ethos/blockchain-manager';
import { type ProfileTypes } from '@ethos/contracts';
import { getDateFromUnix } from '@ethos/helpers';
import { InvitationStatus, ProfileEventType, type Prisma } from '@prisma/client';
import { getAddress } from 'viem';
import { blockchainManager } from '../common/blockchain-manager';
import { prisma, refreshView } from '../data/db';
import { type EventProcessor, type WrangledEvent } from './event-processing';

type Payload = {
  profileCreates: Prisma.ProfileCreateManyInput[];
  profileUpdates: Prisma.ProfileUpdateManyArgs[];
  profileAddressCreates: Prisma.ProfileAddressCreateManyInput[];
  profileAddressDeletes: Prisma.ProfileAddressDeleteManyArgs;
  profileEventCreates: Prisma.ProfileEventUncheckedCreateInput[];
  invitationCreates: Prisma.InvitationCreateManyInput[];
  invitationUpdates: Prisma.InvitationUpdateManyArgs[];
  invitationDeletes: Prisma.InvitationDeleteManyArgs;
};

type EventUnion =
  | WrangledEvent<'ProfileCreated', ProfileTypes.ProfileCreatedEvent.LogDescription>
  | WrangledEvent<'ProfileArchived', ProfileTypes.ProfileArchivedEvent.LogDescription>
  | WrangledEvent<'ProfileRestored', ProfileTypes.ProfileRestoredEvent.LogDescription>
  | WrangledEvent<'AddressClaim', ProfileTypes.AddressClaimEvent.LogDescription>
  | WrangledEvent<'UserInvited', ProfileTypes.UserInvitedEvent.LogDescription>
  | WrangledEvent<'Uninvited', ProfileTypes.UninvitedEvent.LogDescription>
  | WrangledEvent<'InvitesAdded', ProfileTypes.InvitesAddedEvent.LogDescription>;

export const profileEventProcessor: EventProcessor<EventUnion, Payload> = {
  ignoreEvents: new Set(['DefaultInvitesChanged', 'MockProfileCreated']),
  getLogs: async (...args) => await blockchainManager.getProfileEvents(...args),
  parseLog: (log) => blockchainManager.ethosProfile.contract.interface.parseLog(log),
  eventWrangler: (parsed) => {
    switch (parsed.name) {
      case 'ProfileCreated': {
        return {
          ...(parsed as unknown as ProfileTypes.ProfileCreatedEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'ProfileArchived': {
        return {
          ...(parsed as unknown as ProfileTypes.ProfileArchivedEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'ProfileRestored': {
        return {
          ...(parsed as unknown as ProfileTypes.ProfileRestoredEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'AddressClaim': {
        return {
          ...(parsed as unknown as ProfileTypes.AddressClaimEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'UserInvited': {
        return {
          ...(parsed as unknown as ProfileTypes.UserInvitedEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'Uninvited': {
        return {
          ...(parsed as unknown as ProfileTypes.UninvitedEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'InvitesAdded': {
        return {
          ...(parsed as unknown as ProfileTypes.InvitesAddedEvent.LogDescription),
          name: parsed.name,
        };
      }
    }

    return null;
  },
  preparePayload: async (events, logger) => {
    const profileCreates = new Map<ProfileId, Prisma.ProfileCreateManyInput>();
    const profileUpdates: Prisma.ProfileUpdateManyArgs[] = [];
    const profileAddressCreates: Prisma.ProfileAddressCreateManyInput[] = [];
    const profileAddressDeletes: Prisma.ProfileAddressWhereInput[] = [];
    const profileEventCreates: Prisma.ProfileEventUncheckedCreateInput[] = [];
    const invitationCreates: Prisma.InvitationCreateManyInput[] = [];
    const invitationUpdates: Prisma.InvitationUpdateManyArgs[] = [];
    const invitationDeletes: Prisma.InvitationWhereInput[] = [];

    const profileAddressMap = new Map<string, [number, string, boolean]>();
    function profileAddressClaim(
      event: EventUnion,
      profileId: number,
      address: string,
      claim: boolean,
    ): void {
      const key = `${profileId}-${address}`;
      const existing = profileAddressMap.get(key);

      if (!existing) {
        // doesn't exist, insert as is, assume valid
        profileAddressMap.set(key, [profileId, address, claim]);
      } else if (existing[2] !== claim) {
        // exists and flips between insert<->delete
        profileAddressMap.delete(key);
      } else {
        // exists but does not flip
        logger.warn({ data: { event } }, 'unexpected non-flipping address claim');
      }
    }

    async function profileInvitationUpdate(profileId: ProfileId): Promise<void> {
      const profile = await blockchainManager.getProfile(profileId);

      if (!profile) {
        logger.error({ data: { event } }, 'Unable to load profile information from blockchain');

        return;
      }

      profileUpdates.push({
        data: {
          invitesAvailable: profile.inviteInfo.available,
          invitedBy: profile.inviteInfo.invitedBy,
          invitesSent: profile.inviteInfo.sent.map((address) => address.toLowerCase()),
          invitesAcceptedIds: profile.inviteInfo.acceptedIds,
        },
        where: { id: profileId },
      });
    }

    for (const event of events) {
      let profileId: ProfileId;

      if (event.wrangled.name === 'UserInvited') {
        profileId = Number(event.wrangled.args.inviterID);
      } else if (event.wrangled.name === 'Uninvited') {
        profileId = Number(event.wrangled.args.inviterId);
      } else {
        profileId = Number(event.wrangled.args.profileId);
      }

      profileEventCreates.push({
        eventId: event.id,
        profileId,
        type: eventTypeByEventName.get(event.wrangled.name),
      });

      switch (event.wrangled.name) {
        case 'ProfileCreated': {
          const profile = await blockchainManager.getProfile(profileId);

          if (!profile) {
            logger.error({ data: { event } }, 'Unable to load profile information from blockchain');
            continue;
          }
          const invitedByProfile = await blockchainManager.getProfile(profile.inviteInfo.invitedBy);

          if (!invitedByProfile) {
            logger.error(
              { data: { event } },
              'Unable to load invitedBy profile information from blockchain',
            );
            continue;
          }

          profileCreates.set(profileId, {
            id: profile.id,
            createdAt: getDateFromUnix(profile.createdAt),
            invitesAvailable: profile.inviteInfo.available,
            invitedBy: profile.inviteInfo.invitedBy,
            invitesSent: profile.inviteInfo.sent.map((address) => address.toLowerCase()),
            invitesAcceptedIds: profile.inviteInfo.acceptedIds,
          });

          profileAddressClaim(event.wrangled, profileId, event.wrangled.args.addr, true);

          // update the profile of the person who invited this new user
          profileUpdates.push({
            data: {
              invitesAvailable: invitedByProfile.inviteInfo.available,
              invitesSent: invitedByProfile.inviteInfo.sent.map((address) => address.toLowerCase()),
              invitesAcceptedIds: invitedByProfile.inviteInfo.acceptedIds,
            },
            where: { id: invitedByProfile.id },
          });

          // update the invitation to show that it was accepted
          invitationUpdates.push({
            data: {
              acceptedProfileId: profile.id,
              status: InvitationStatus.ACCEPTED,
              statusUpdatedAt: getDateFromUnix(profile.createdAt),
            },
            where: { senderProfileId: invitedByProfile.id, recipient: profile.primaryAddress },
          });
          // decline any other existing invitations
          invitationUpdates.push({
            data: {
              status: InvitationStatus.DECLINED,
              statusUpdatedAt: getDateFromUnix(profile.createdAt),
            },
            where: {
              senderProfileId: { not: invitedByProfile.id },
              recipient: profile.primaryAddress,
            },
          });

          break;
        }
        case 'UserInvited': {
          const sentAt = await blockchainManager.ethosProfile.getInvitationSentTime(
            profileId,
            getAddress(event.wrangled.args.inviteeAddress),
          );
          invitationCreates.push({
            senderProfileId: profileId,
            recipient: event.wrangled.args.inviteeAddress,
            sentAt: getDateFromUnix(sentAt),
            statusUpdatedAt: getDateFromUnix(sentAt),
          });
          await profileInvitationUpdate(profileId);
          break;
        }
        case 'Uninvited': {
          invitationDeletes.push({
            senderProfileId: profileId,
            recipient: event.wrangled.args.uninvitedUser,
          });
          await profileInvitationUpdate(profileId);
          break;
        }
        case 'InvitesAdded': {
          await profileInvitationUpdate(profileId);
          break;
        }
        case 'ProfileArchived': {
          profileUpdates.push({
            data: { archived: true },
            where: { id: profileId },
          });
          break;
        }
        case 'ProfileRestored': {
          profileUpdates.push({
            data: { archived: false },
            where: { id: profileId },
          });
          break;
        }
        case 'AddressClaim': {
          if (event.wrangled.args.claim === 0n) {
            // Unclaimed
            profileAddressClaim(event.wrangled, profileId, event.wrangled.args.addr, false);
          } else if (event.wrangled.args.claim === 1n) {
            // Claimed
            profileAddressClaim(event.wrangled, profileId, event.wrangled.args.addr, true);
          } else {
            logger.warn({ data: { event } }, `unhandled AddressClaim enum`);
          }
          // todo decline invitations for this address; it can't be used to create a new profile
          // (this only matters once we support multiple addresses per profile)
          break;
        }
      }
    }

    for (const [profileId, address, claim] of profileAddressMap.values()) {
      if (claim) {
        profileAddressCreates.push({ profileId, address });
      } else {
        profileAddressDeletes.push({ profileId, address });
      }
    }

    return {
      payload: {
        profileCreates: Array.from(profileCreates.values()),
        profileUpdates,
        profileAddressCreates,
        profileAddressDeletes: {
          where: {
            OR: profileAddressDeletes,
          },
        },
        profileEventCreates,
        invitationCreates,
        invitationUpdates,
        invitationDeletes: { where: { OR: invitationDeletes } },
      },
      dirtyScoreTargets: [],
    };
  },
  submitPayload: async ({
    profileCreates,
    profileUpdates,
    profileAddressCreates,
    profileAddressDeletes,
    profileEventCreates,
    invitationCreates,
    invitationUpdates,
    invitationDeletes,
  }) => {
    await prisma.$transaction([
      prisma.profile.createMany({ data: profileCreates, skipDuplicates: true }),
      prisma.profileEvent.createMany({ data: profileEventCreates, skipDuplicates: true }),
      // eslint-disable-next-line @typescript-eslint/promise-function-async
      ...profileUpdates.map((x) => prisma.profile.updateMany(x)),
      prisma.profileAddress.createMany({ data: profileAddressCreates, skipDuplicates: true }),
      prisma.profileAddress.deleteMany(profileAddressDeletes),
      prisma.invitation.createMany({ data: invitationCreates, skipDuplicates: true }),
      // eslint-disable-next-line @typescript-eslint/promise-function-async
      ...invitationUpdates.map((x) => prisma.invitation.updateMany(x)),
      prisma.invitation.deleteMany(invitationDeletes),
    ]);

    await refreshView('targets');
  },
};

const eventTypeByEventName = new Map<string, ProfileEventType>([
  ['ProfileCreated', ProfileEventType.CREATE],
  ['ProfileArchived', ProfileEventType.ARCHIVE],
  ['ProfileRestored', ProfileEventType.RESTORE],
  ['UserInvited', ProfileEventType.INVITE],
  ['Uninvited', ProfileEventType.UNINVITE],
]);
