import { type ProfileId, type Vote } from '@ethos/blockchain-manager';
import {
  type TargetContract,
  discussionContractName,
  reviewContractName,
  vouchContractName,
  type Contract,
  attestationContractName,
} from '@ethos/contracts';
import { type VoteInfo } from '@ethos/domain';
import { notEmpty } from '@ethos/helpers';
import { type Prisma } from '@prisma-pg/client';
import { cloneDeep } from 'lodash-es';
import { z } from 'zod';
import { convert } from '../../data/conversion.js';
import { prisma } from '../../data/db.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';

const targetContractNames: TargetContract[] = [
  discussionContractName,
  vouchContractName,
  reviewContractName,
  attestationContractName,
];
function validTargetContract(contract: Contract): contract is TargetContract {
  return targetContractNames.includes(contract as TargetContract);
}

// Example of a valid schema
/*
const input = {
  review: [1, 2, 3], vouch: [1, 2, 3], discussion: [1, 2, 3]
  connectedAddress: '0x1234567890123456789012345678901234567890',
  includeArchived: true,
};
where 'review', 'vouch', and 'discussion' are keys from activities
*/
const schema = z.object({
  review: z.array(z.coerce.number().nonnegative()).optional(),
  vouch: z.array(z.coerce.number().nonnegative()).optional(),
  discussion: z.array(z.coerce.number().nonnegative()).optional(),
  attestation: z.array(z.coerce.number().nonnegative()).optional(),
  // allow voter lookup to fail if it's not valid; that way we can still return the vote counts
  connectedProfile: z.number().positive().optional(),
  includeArchived: z.boolean().optional(),
});

type BulkVoteLookup = z.infer<typeof schema>;

export type BulkVotes = Record<
  TargetContract,
  Record<number, { userVote: Vote | null; counts: VoteInfo }>
>;

export class BulkVotesService extends Service<typeof schema, BulkVotes> {
  validate(params: AnyRecord): BulkVoteLookup {
    return this.validator(params, schema);
  }

  async execute({
    review,
    vouch,
    discussion,
    attestation,
    connectedProfile,
    includeArchived,
  }: BulkVoteLookup): Promise<BulkVotes> {
    // populate a sparse list of activities
    const activities = [
      review && { type: reviewContractName, ids: review },
      vouch && { type: vouchContractName, ids: vouch },
      discussion && { type: discussionContractName, ids: discussion },
      attestation && { type: attestationContractName, ids: attestation },
    ].filter(notEmpty) as Array<{ type: TargetContract; ids: number[] }>;

    const [userVotes, voteCounts] = await Promise.all([
      this.getUserVotes(activities, connectedProfile, includeArchived),
      this.getVoteCounts(activities),
    ]);

    const results: BulkVotes = {
      review: {},
      vouch: {},
      discussion: {},
      attestation: {},
    };

    activities.forEach(({ type, ids }) => {
      const voteInfo = voteCounts[type];
      const userVote = userVotes[type];

      ids.forEach((id) => {
        results[type][id] = {
          userVote: userVote?.[id] ?? null,
          counts: voteInfo[id],
        };
      });
    });

    return results;
  }

  async getUserVotes(
    activities: Array<{ type: TargetContract; ids: number[] }>,
    connectedProfile?: ProfileId,
    includeArchived?: boolean,
  ): Promise<Record<TargetContract, Record<number, Vote>>> {
    const results: Record<TargetContract, Record<number, Vote>> = {
      review: {},
      vouch: {},
      discussion: {},
      attestation: {},
    };

    if (!connectedProfile) {
      return results;
    }

    const where: Prisma.VoteWhereInput = {
      voter: connectedProfile,
    };

    if (!includeArchived) {
      where.isArchived = false;
    }

    // prepare promises for each activity, so that we can run the database
    // queries in parallel
    const votePromises = activities.map(async (activity) => {
      const activityWhere = {
        ...where,
        targetId: { in: activity.ids },
        targetContract: this.blockchainManager.contractLookup[activity.type].address,
      };
      const votes = await prisma.vote.findMany({ where: activityWhere });

      return votes.map((prismaVote) => {
        const vote = convert.toVote(prismaVote);
        const contract = this.blockchainManager.getContractName(vote.targetContract);

        if (!contract || !validTargetContract(contract)) {
          this.logger.error(`Unknown contract: ${vote.targetContract}`);

          return null;
        }

        return { contract, targetId: prismaVote.targetId, vote };
      });
    });

    const allVotes = await Promise.all(votePromises);

    allVotes
      .flat()
      .filter(notEmpty)
      .forEach(({ contract, targetId, vote }) => {
        results[contract][targetId] = vote;
      });

    return results;
  }

  async getVoteCounts(
    activities: Array<{ type: TargetContract; ids: number[] }>,
  ): Promise<Record<TargetContract, Record<number, VoteInfo>>> {
    const results: Record<TargetContract, Record<number, VoteInfo>> = {
      review: {},
      vouch: {},
      discussion: {},
      attestation: {},
    };

    const voteInfoBulk = await Promise.all(
      activities.map(async (activity) => ({
        contract: activity.type,
        voteInfo: await this.getVoteInfo(activity.type, activity.ids),
      })),
    );

    voteInfoBulk.filter(notEmpty).forEach(({ contract, voteInfo }) => {
      results[contract] = voteInfo;
    });

    return results;
  }

  async getVoteInfo(type: TargetContract, ids: number[]): Promise<Record<number, VoteInfo>> {
    const empty: VoteInfo = {
      upvotes: 0,
      downvotes: 0,
    };
    const targetContract = this.blockchainManager.getContractAddress(type);
    const voteInfoMap: Record<number, VoteInfo> = {};

    // initialize a value for each id as 0/0/null
    for (const id of ids) {
      voteInfoMap[id] = cloneDeep(empty);
    }

    const voteCounts = await prisma.vote.groupBy({
      by: ['targetId', 'isUpvote'],
      where: {
        targetContract,
        targetId: { in: ids },
        isArchived: false,
      },
      _count: {
        _all: true,
      },
    });

    for (const voteCount of voteCounts) {
      if (voteCount.isUpvote) {
        voteInfoMap[voteCount.targetId].upvotes = voteCount._count._all;
      } else {
        voteInfoMap[voteCount.targetId].downvotes = voteCount._count._all;
      }
    }

    return voteInfoMap;
  }
}
