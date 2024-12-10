import { type TargetContract } from '@ethos/contracts';
import { getAddress } from 'viem';
import { type ArgumentsCamelCase, type Argv } from 'yargs';
import { validTargetContracts } from '../utils/config.js';
import { Validator } from '../utils/input.js';
import { error, out, txn, f } from '../utils/output.js';
import { type WalletManager } from '../utils/walletManager.js';
import { Command, Subcommand } from './command.js';

export class ReplyCommand extends Command {
  public readonly name = 'reply';
  public readonly description = 'Reply to discussions and other activities';
  public readonly subcommands = [
    new AddReply(),
    new EditReply(),
    new GetReply(),
    new GetRepliesFor(),
    new ShowLastReplies(),
  ];
}

class AddReply extends Subcommand {
  public readonly name = 'add';
  public readonly description = 'Add a reply to an activity';
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
      content: {
        type: 'string',
        alias: 't',
        describe: 'Reply content',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const targetContract = new Validator(argv).String('targetContract');
    const targetId = new Validator(argv).Integer('targetId');
    const content = new Validator(argv).String('content');

    if (!isValidTargetContract(targetContract)) {
      error(`Invalid target contract: ${targetContract}`);

      return;
    }

    out(`💬 Adding reply to ${targetContract} with ID ${targetId}`);
    await txn(user.connect.ethosDiscussion.addReply(targetContract, targetId, content));
  }
}

class EditReply extends Subcommand {
  public readonly name = 'edit';
  public readonly description = 'Edit an existing reply';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      replyId: {
        type: 'number',
        alias: 'i',
        describe: 'Reply ID',
        demandOption: true,
      },
      content: {
        type: 'string',
        alias: 't',
        describe: 'New reply content',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const replyId = new Validator(argv).Integer('replyId');
    const content = new Validator(argv).String('content');

    out(`✏️ Editing reply with ID ${replyId}`);
    await txn(user.connect.ethosDiscussion.editReply(replyId, content, ''));
  }
}

class GetReply extends Subcommand {
  public readonly name = 'get';
  public readonly description = 'Get reply by ID';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      replyId: {
        type: 'number',
        alias: 'i',
        describe: 'Reply ID',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const replyId = new Validator(argv).Integer('replyId');

    const reply = await user.connect.ethosDiscussion.repliesById([BigInt(replyId)]);
    outputReplyInfo(user, reply[0]);
  }
}

class GetRepliesFor extends Subcommand {
  public readonly name = 'show';
  public readonly description = 'Show all replies for a target contract and ID';
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
        describe: 'Number of replies to fetch per batch',
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

    out(`📊 Fetching ${batchSize} replies for ${targetContract} with ID ${targetId}`);

    const fromIdx = 0;
    const targetAddress = user.connect.getContractAddress(targetContract);

    if (!targetAddress) {
      error(`Could not find address for contract: ${targetContract}`);

      return;
    }

    const replies = await user.connect.ethosDiscussion.directRepliesInRange(
      targetAddress,
      targetId,
      fromIdx,
      batchSize,
    );

    replies.forEach((reply, index) => {
      outputReplyInfo(user, reply, index);
    });

    out(f('Total replies:', replies.length.toString()));
  }
}

class ShowLastReplies extends Subcommand {
  public readonly name = 'last';
  public readonly description = 'Show the last N replies';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      count: {
        type: 'number',
        alias: 'n',
        describe: 'Number of replies to show',
        default: 10,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const count = new Validator(argv).Integer('count');

    out(`📊 Fetching last ${count} replies`);

    const totalReplies = (await user.connect.ethosDiscussion.getReplyCount()) - 1n;
    const startId = totalReplies;
    const endId = BigInt(Math.max(1, Number(totalReplies) - count + 1));

    const replyIds = Array.from(
      { length: Number(startId - endId + 1n) },
      (_, i) => startId - BigInt(i),
    );
    const replies = await user.connect.ethosDiscussion.repliesById(replyIds);

    replies.forEach((reply, index) => {
      outputReplyInfo(user, reply, Number(totalReplies) - index);
    });
  }
}

function isValidTargetContract(targetContract: unknown): targetContract is TargetContract {
  return validTargetContracts.includes(targetContract as string);
}

type Reply =
  ReturnType<WalletManager['connect']['ethosDiscussion']['repliesById']> extends Promise<
    Array<infer R>
  >
    ? R
    : never;

function outputReplyInfo(user: WalletManager, reply: Reply, index?: number): void {
  if (reply.authorProfileId === 0n) {
    out('Reply not found');

    return;
  }

  const prefix = index !== undefined ? `Reply #${index}:` : '';
  out(prefix);
  out(f('  Reply ID:', reply.id.toString()));
  out(f('  Author:', reply.authorProfileId.toString()));
  out(f('  Content:', reply.content));
  out(f('  Metadata:', reply.metadata));
  out(
    f('  Contract:', user.connect.getContractName(getAddress(reply.targetContract)) ?? 'Unknown'),
  );
  out(f('  Parent ID:', reply.parentId.toString()));
  out(f('  Created At:', new Date(Number(reply.createdAt) * 1000).toLocaleString()));
  out(f('  Edits:', reply.edits.toString()));
}
