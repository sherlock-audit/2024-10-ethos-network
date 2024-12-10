import {
  type TargetContract,
  isTargetContract,
  attestationContractName,
  reviewContractName,
  vouchContractName,
  discussionContractName,
} from '@ethos/contracts';
import { type EthosUserTarget, type VoteInfo } from '@ethos/domain';
import { getAddress } from 'viem';
import { blockchainManager } from '../common/blockchain-manager.js';
import { prisma } from './db.js';

/**
 * Gets the upvote and downvote counts for a specific target
 * @param targetId - The ID of the target (review, vouch, discussion, or attestation)
 * @param targetType - The type of target
 * @returns Promise resolving to vote counts object
 */
export async function getVoteCounts(
  targetId: number,
  targetType: TargetContract,
): Promise<VoteInfo> {
  const [upvotes, downvotes] = await Promise.all([
    prisma.vote.count({
      where: {
        targetId,
        targetContract: blockchainManager.getContractAddress(targetType),
        isArchived: false,
        isUpvote: true,
      },
    }),
    prisma.vote.count({
      where: {
        targetId,
        targetContract: blockchainManager.getContractAddress(targetType),
        isArchived: false,
        isUpvote: false,
      },
    }),
  ]);

  return { upvotes, downvotes };
}

/**
 * Represents vote counts for a specific activity
 */
type VoteCounts = {
  /** ID of the target activity (review, vouch, discussion, or attestation) */
  activityId: number;
  /** Upvote and downvote counts */
  voteInfo: VoteInfo;
  /** Contract type of the target activity (redundant, but included for clarity) */
  targetContract: TargetContract;
};

type BulkVoteLookup = Partial<Record<TargetContract, number[]>>;
type BulkVoteCounts = Partial<Record<TargetContract, VoteCounts[]>>;

/**
 * Gets vote counts for multiple activities simultaneously
 * @param targets - Object mapping contract types to arrays of target IDs
 * @returns Promise resolving to object mapping contract types to vote count results
 * @example
 * const targets = {
 *   review: [1, 2, 3],
 *   vouch: [4, 5]
 * };
 * const results = await getBulkVoteCounts(targets);
 */
export async function getBulkVoteCounts(targets: BulkVoteLookup): Promise<BulkVoteCounts> {
  const result: BulkVoteCounts = {};

  // Process each contract type and its target IDs sequentially
  for (const [contract, activityIds] of Object.entries(targets)) {
    if (!isTargetContract(contract)) continue;

    const contractAddress = blockchainManager.getContractAddress(contract);

    const [upvotes, downvotes] = await Promise.all([
      // Get upvotes grouped by targetId
      prisma.vote.groupBy({
        by: ['targetId'],
        where: {
          targetId: { in: activityIds },
          targetContract: contractAddress,
          isArchived: false,
          isUpvote: true,
        },
        _count: true,
      }),
      // Get downvotes grouped by targetId
      prisma.vote.groupBy({
        by: ['targetId'],
        where: {
          targetId: { in: activityIds },
          targetContract: contractAddress,
          isArchived: false,
          isUpvote: false,
        },
        _count: true,
      }),
    ]);

    // Create Maps for O(1) lookup
    const upvoteMap = new Map(upvotes.map((v) => [v.targetId, v._count]));
    const downvoteMap = new Map(downvotes.map((v) => [v.targetId, v._count]));

    result[contract] = activityIds.map((activityId) => ({
      activityId,
      voteInfo: {
        upvotes: upvoteMap.get(activityId) ?? 0,
        downvotes: downvoteMap.get(activityId) ?? 0,
      },
      targetContract: contract,
    }));
  }

  return result;
}

/**
 * Gets the EthosUserTarget of the author of the activity that was voted on
 * Looks up the vote target based on the contract type and ID
 * And from the vote target, finds the activity author's EthosUserTarget
 * Note: input types match the Vote type in the VoteAbi.ts used in event processing
 * @param vote - The vote record from the database
 * @returns Promise resolving to the author's EthosUserTarget
 */
export async function getVoteTargetAuthorUserkey(vote: {
  targetContract: string;
  targetId: bigint;
}): Promise<EthosUserTarget> {
  // Get the contract type from the address
  const contractType = blockchainManager.getContractName(getAddress(vote.targetContract));
  const id = Number(vote.targetId);
  // Look up the activity based on contract type
  switch (contractType) {
    case reviewContractName: {
      const review = await prisma.review.findUnique({
        where: { id },
        select: { author: true },
      });

      if (!review) throw new Error('Review not found');

      return { address: getAddress(review.author) };
    }

    case vouchContractName: {
      const vouch = await prisma.vouch.findUnique({
        where: { id },
        select: { authorProfileId: true },
      });

      if (!vouch) throw new Error('Vouch not found');

      return { profileId: vouch.authorProfileId };
    }

    case attestationContractName: {
      const attestation = await prisma.attestation.findUnique({
        where: { id },
        select: { profileId: true },
      });

      if (!attestation) throw new Error('Attestation not found');

      return { profileId: attestation.profileId };
    }

    case discussionContractName: {
      const discussion = await prisma.reply.findUnique({
        where: { id },
        select: { authorProfileId: true },
      });

      if (!discussion) throw new Error('Discussion not found');

      return { profileId: discussion.authorProfileId };
    }

    default:
      throw new Error(`Unsupported contract type: ${contractType}`);
  }
}
