import {
  ScoreByValue,
  type Vouch,
  type Review,
  type Vote,
  type Profile,
  type Attestation,
  type AttestationService,
  type Reply,
  type VouchFunds,
} from '@ethos/blockchain-manager';
import { X_SERVICE, type LiteProfile, type BlockchainEvent } from '@ethos/domain';
import { getUnixTime } from '@ethos/helpers';
import { Prisma } from '@prisma/client';
import { type Address, getAddress } from 'viem';
import { blockchainManager } from '../common/blockchain-manager';

/**
 * This file contains conversion functions for transforming Prisma database models
 * into blockchain-manager types that match our smart contracts
 */

export type PrismaLiteProfile = Prisma.ProfileGetPayload<{
  select: {
    id: true;
    archived: true;
    createdAt: true;
    updatedAt: true;
    invitedBy: true;
    invitesAvailable: true;
  };
}>;

type PrismaProfile = Prisma.ProfileGetPayload<{
  select: {
    id: true;
    archived: true;
    createdAt: true;
    updatedAt: true;
    invitesSent: true;
    invitesAcceptedIds: true;
    invitesAvailable: true;
    invitedBy: true;
    Attestation: true;
  };
}>;

function toProfile(
  profile: PrismaProfile,
  addresses: Address[],
): Profile & {
  attestations: Attestation[];
} {
  return {
    id: profile.id,
    archived: profile.archived,
    createdAt: getUnixTime(profile.createdAt),
    addresses,
    primaryAddress: addresses[0],
    inviteInfo: {
      sent: profile.invitesSent.map((address) => getAddress(address)),
      acceptedIds: profile.invitesAcceptedIds,
      available: profile.invitesAvailable,
      invitedBy: profile.invitedBy,
    },
    attestations: toAttestations(profile.Attestation),
  };
}

function toLiteProfile(profile?: PrismaLiteProfile | null): LiteProfile | null {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    archived: profile.archived,
    createdAt: getUnixTime(profile.createdAt),
    updatedAt: getUnixTime(profile.updatedAt),
    invitesAvailable: profile.invitesAvailable,
    invitedBy: profile.invitedBy,
  };
}

function toLiteProfiles(profiles: PrismaLiteProfile[]): LiteProfile[] {
  return profiles.map((p) => toLiteProfile(p)).filter((p): p is LiteProfile => p !== null);
}

type PrismaAttestations = Prisma.AttestationGetPayload<{
  select: {
    id: true;
    archived: true;
    profileId: true;
    createdAt: true;
    updatedAt: true;
    account: true;
    service: true;
  };
}>;

function toAttestations(attestations: PrismaAttestations[]): Attestation[] {
  return attestations.map((a) => ({
    id: a.id,
    hash: blockchainManager.ethosAttestation.hash(a.service, a.account),
    account: a.account,
    service: a.service === X_SERVICE ? X_SERVICE : X_SERVICE, // TODO support more than x.com someday
    archived: a.archived,
    profileId: a.profileId,
    createdAt: getUnixTime(a.createdAt),
  }));
}

type PrismaReview = Prisma.ReviewGetPayload<{
  select: {
    id: true;
    author: true;
    authorProfileId: true;
    subject: true;
    score: true;
    comment: true;
    metadata: true;
    createdAt: true;
    archived: true;
    account: true;
    service: true;
  };
}>;

function toReview(review: PrismaReview): Review {
  return {
    id: review.id,
    author: getAddress(review.author),
    authorProfileId: review.authorProfileId,
    subject: getAddress(review.subject),
    score: ScoreByValue[review.score as keyof typeof ScoreByValue],
    comment: review.comment,
    metadata: review.metadata,
    createdAt: getUnixTime(review.createdAt),
    archived: review.archived,
    attestationDetails: {
      account: review.account.toLowerCase(),
      service: review.service.toLowerCase(),
    },
  };
}

type PrismaVouch = Prisma.VouchGetPayload<{
  select: {
    id: true;
    authorProfileId: true;
    subjectProfileId: true;
    deposited: true;
    staked: true;
    withdrawn: true;
    balance: true;
    comment: true;
    metadata: true;
    archived: true;
    unhealthy: true;
    stakeToken: true;
    vouchedAt: true;
    unvouchedAt: true;
    unhealthyAt: true;
  };
}>;

function toVouch(vouch: PrismaVouch): Vouch & VouchFunds {
  return {
    id: vouch.id,
    authorProfileId: vouch.authorProfileId,
    subjectProfileId: vouch.subjectProfileId,
    deposited: toBigint(vouch.deposited),
    staked: toBigint(vouch.staked),
    balance: toBigint(vouch.balance),
    withdrawn: toBigint(vouch.withdrawn),
    comment: vouch.comment,
    metadata: vouch.metadata,
    archived: vouch.archived,
    unhealthy: vouch.unhealthy,
    stakeToken: getAddress(vouch.stakeToken),
    activityCheckpoints: {
      vouchedAt: getUnixTime(vouch.vouchedAt),
      unvouchedAt: vouch.unvouchedAt ? getUnixTime(vouch.unvouchedAt) : 0,
      unhealthyAt: vouch.unhealthyAt ? getUnixTime(vouch.unhealthyAt) : 0,
    },
  };
}

type PrismaVote = Prisma.VoteGetPayload<{
  select: {
    isUpvote: true;
    isArchived: true;
    voter: true;
    targetContract: true;
    targetId: true;
    createdAt: true;
  };
}>;

function toVote(vote: PrismaVote): Vote {
  return {
    isUpvote: vote?.isUpvote,
    isArchived: vote?.isArchived,
    voter: vote?.voter,
    targetContract: getAddress(vote?.targetContract),
    targetId: BigInt(vote?.targetId),
    createdAt: getUnixTime(vote?.createdAt),
  };
}

type PrismaBlockchainEvent = Prisma.BlockchainEventGetPayload<{
  select: {
    id: true;
    contract: true;
    logData: true;
    blockNumber: true;
    blockIndex: true;
    createdAt: true;
    updatedAt: true;
    txHash: true;
    processed: true;
  };
}>;

function toBlockchainEvent(event: PrismaBlockchainEvent): BlockchainEvent {
  return {
    id: event.id,
    blockIndex: event.blockIndex,
    blockNumber: event.blockNumber,
    contract: event.contract,
    createdAt: getUnixTime(event.createdAt),
    processed: event.processed,
    txHash: event.txHash,
    updatedAt: getUnixTime(event.updatedAt),
  };
}

function toBigint(value: Prisma.Decimal): bigint {
  return BigInt(value.toString());
}

function toDecimal(value: bigint): Prisma.Decimal {
  return new Prisma.Decimal(value.toString());
}

type PrismaProfileWithAddresses = Prisma.ProfileGetPayload<{
  include: { ProfileAddress: true };
}>;

function toProfileFromPrisma(item: PrismaProfileWithAddresses): Profile {
  return {
    id: item.id,
    archived: item.archived,
    createdAt: getUnixTime(item.createdAt),
    addresses: item.ProfileAddress.map((x) => getAddress(x.address)),
    primaryAddress: getAddress(item.ProfileAddress[0]?.address),
    inviteInfo: {
      sent: item.invitesSent.map((x) => getAddress(x)),
      acceptedIds: item.invitesAcceptedIds,
      available: item.invitesAvailable,
      invitedBy: item.invitedBy,
    },
  };
}

type PrismaAttestation = Prisma.AttestationGetPayload<{
  select: {
    id: true;
    hash: true;
    archived: true;
    profileId: true;
    account: true;
    service: true;
    createdAt: true;
  };
}>;

function toAttestationFromPrisma(item: PrismaAttestation): Attestation {
  return {
    id: item.id,
    hash: item.hash,
    archived: item.archived,
    profileId: item.profileId,
    account: item.account,
    service: item.service as AttestationService,
    createdAt: getUnixTime(item.createdAt),
  };
}

type PrismaReply = Prisma.ReplyGetPayload<{
  select: {
    parentIsOriginalComment: true;
    targetContract: true;
    authorProfileId: true;
    id: true;
    parentId: true;
    createdAt: true;
    content: true;
    metadata: true;
  };
}>;

function toReplyFromPrisma(item: PrismaReply): Reply {
  return {
    parentIsOriginalComment: item.parentIsOriginalComment,
    targetContract: item.targetContract,
    authorProfileId: item.authorProfileId,
    id: BigInt(item.id),
    parentId: BigInt(item.parentId),
    createdAt: getUnixTime(item.createdAt),
    content: item.content,
    metadata: item.metadata,
  };
}

export const convert = {
  toLiteProfile,
  toLiteProfiles,
  toProfile,
  toAttestations,
  toReview,
  toVouch,
  toVote,
  toBlockchainEvent,
  toBigint,
  toDecimal,
  toProfileFromPrisma,
  toAttestationFromPrisma,
  toReplyFromPrisma,
};
