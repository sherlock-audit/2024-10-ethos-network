import { type TargetContract } from '@ethos/contracts';
import { getAddress } from 'viem';
import { type ArgumentsCamelCase, type Argv } from 'yargs';
import { validTargetContracts } from '../utils/config';
import { Validator } from '../utils/input';
import { error, out, txn, f } from '../utils/output';
import { type WalletManager } from '../utils/walletManager';
import { Command, Subcommand } from './command';

export class VoteCommand extends Command {
  public readonly name = 'vote';
  public readonly description = 'Vote on reviews and other activities';
  public readonly subcommands = [
    new VoteFor(),
    new GetVote(),
    new GetVotesFor(),
    new ShowLastVotes(),
  ];
}

class VoteFor extends Subcommand {
  public readonly name = 'for';
  public readonly description = 'Vote for an activity';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      targetContract: {
        type: 'string',
        alias: 'c',
        describe: 'Target contract',
        demandOption: true,
        choices: validTargetContracts,
      },
      targetId: {
        type: 'number',
        alias: 'i',
        describe: 'Activity ID',
        demandOption: true,
      },
      isUpvote: {
        type: 'boolean',
        alias: 'u',
        describe: 'Is this an upvote?',
        default: true,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const targetContract = new Validator(argv).String('targetContract');
    const targetId = new Validator(argv).Integer('targetId');
    const isUpvote = new Validator(argv).Boolean('isUpvote');

    if (!isValidTargetContract(targetContract)) {
      error(`Invalid target contract: ${targetContract}`);

      return;
    }

    out(
      `🗳️ Voting for ${targetContract} with ID ${targetId} (${isUpvote ? 'Upvote' : 'Downvote'})`,
    );
    await txn(user.connect.ethosVote.voteFor(targetContract, targetId, isUpvote));
  }
}

class GetVote extends Subcommand {
  public readonly name = 'get';
  public readonly description = 'Get vote by ID';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      voteId: {
        type: 'number',
        alias: 'i',
        describe: 'Vote ID',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const voteId = new Validator(argv).Integer('voteId');

    const vote = await user.connect.ethosVote.getVoteById(voteId);
    outputVoteInfo(user, vote);
  }
}

class GetVotesFor extends Subcommand {
  public readonly name = 'show';
  public readonly description = 'Show all votes for a target contract and ID';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      targetContract: {
        type: 'string',
        alias: 'c',
        describe: 'Target contract',
        demandOption: true,
        choices: validTargetContracts,
      },
      targetId: {
        type: 'number',
        alias: 'i',
        describe: 'Target ID',
        demandOption: true,
      },
      batchSize: {
        type: 'number',
        alias: 'b',
        describe: 'Number of votes to fetch per batch',
        default: 100,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const targetContract = new Validator(argv).String('targetContract');
    const targetId = new Validator(argv).Integer('targetId');
    const batchSize = new Validator(argv).Integer('batchSize');

    if (!isValidTargetContract(targetContract)) {
      error(`Invalid target contract: ${targetContract}`);

      return;
    }

    out(`📊 Fetching ${batchSize} votes for ${targetContract} with ID ${targetId}`);

    const fromIdx = 0;

    const votes = await user.connect.ethosVote.getVotesInRangeFor(
      targetContract,
      targetId,
      fromIdx,
      batchSize,
    );

    votes.forEach((vote, index) => {
      outputVoteInfo(user, vote, index);
    });

    out(f('Total votes:', votes.length.toString()));
  }
}

class ShowLastVotes extends Subcommand {
  public readonly name = 'last';
  public readonly description = 'Show the last N votes';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      count: {
        type: 'number',
        alias: 'n',
        describe: 'Number of votes to show',
        default: 10,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const count = new Validator(argv).Integer('count');

    out(`📊 Fetching last ${count} votes`);

    const totalVotes = await user.connect.ethosVote.getVoteCount();
    const startId = totalVotes - 1n;
    const endId = BigInt(Math.max(0, Number(startId) - count + 1));

    const voteIds = Array.from(
      { length: Number(startId - endId + 1n) },
      (_, i) => startId - BigInt(i),
    );

    for (const voteId of voteIds) {
      const vote = await user.connect.ethosVote.getVoteById(Number(voteId));
      outputVoteInfo(user, vote, Number(voteId));
    }
  }
}

function isValidTargetContract(targetContract: unknown): targetContract is TargetContract {
  if (typeof targetContract !== 'string') {
    return false;
  }

  return validTargetContracts.includes(targetContract);
}

type Vote =
  ReturnType<WalletManager['connect']['ethosVote']['getVoteById']> extends Promise<infer T>
    ? T
    : never;

function outputVoteInfo(user: WalletManager, vote: Vote, index?: number): void {
  if (vote.voter === 0n) {
    out('Vote not found');

    return;
  }

  const prefix = index !== undefined ? `Vote #${index}:` : '';
  out(prefix);
  out(f('  Voter:', vote.voter.toString()));

  if (vote.targetContract && typeof vote.targetContract === 'string') {
    const contractName = user.connect.getContractName(getAddress(vote.targetContract)) ?? 'Unknown';
    out(f('  Contract:', contractName));
  }
  out(f('  Target ID:', vote.targetId.toString()));
  out(f('  Is Upvote:', vote.isUpvote ? 'Yes' : 'No'));

  if (vote.isArchived !== undefined) {
    out(f('  Archived:', vote.isArchived ? 'Yes' : 'No'));
  }
  out(f('  Timestamp:', new Date(Number(vote.createdAt) * 1000).toLocaleString()));
}
