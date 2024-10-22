import { type Address } from 'viem';
import type yargs from 'yargs';
import { Validator } from '../utils/input';
import { error, out, txn } from '../utils/output';
import { type WalletManager } from '../utils/walletManager';
import { Command, Subcommand } from './command';

class SendInvite extends Subcommand {
  public readonly name = 'send';
  public readonly description = 'Send an invite to a user';
  public readonly arguments = (yargs: yargs.Argv): yargs.Argv =>
    yargs.options({
      recipient: {
        type: 'string',
        alias: 'r',
        describe: 'Nickname, ENS, or address of the recipient',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: yargs.ArgumentsCamelCase<unknown>): Promise<void> {
    const recipient = new Validator(argv).String('recipient');
    const address = await user.interpretName(recipient);
    out(`📨 Sending invite to: ${recipient}`);
    await txn(user.connect.inviteAddress(address));
  }
}

class AcceptInvite extends Subcommand {
  public readonly name = 'accept';
  public readonly description = 'Accept an invite from a user';
  public readonly arguments = (yargs: yargs.Argv): yargs.Argv =>
    yargs.options({
      sender: {
        type: 'string',
        alias: 's',
        describe: 'Nickname, ENS, or address of the sender',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: yargs.ArgumentsCamelCase<unknown>): Promise<void> {
    const sender = new Validator(argv).String('sender');
    const address = await user.interpretName(sender);
    const senderProfile = await user.connect.ethosProfile.getProfileByAddress(address);

    if (!senderProfile) {
      error('Invalid sender; does not have an ethos profile');

      return;
    }

    out(`👥 Accepting invite from: ${senderProfile.primaryAddress}`);
    await txn(user.connect.createProfile(senderProfile.id));
  }
}

class RevokeInvite extends Subcommand {
  public readonly name = 'revoke';
  public readonly description = 'Revoke an invite from a user';
  public readonly arguments = (yargs: yargs.Argv): yargs.Argv =>
    yargs.options({
      recipient: {
        type: 'string',
        alias: 'r',
        describe: 'Nickname, ENS, or address of the recipient',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: yargs.ArgumentsCamelCase<unknown>): Promise<void> {
    const recipient = new Validator(argv).String('recipient');
    const address = await user.interpretName(recipient);
    out(`📤 Revoking invite from: ${recipient}`);
    await txn(user.connect.uninviteUser(address));
  }
}

class GrantInvite extends Subcommand {
  public readonly name = 'grant';
  public readonly description = 'Grant invites to a user';
  public readonly arguments = (yargs: yargs.Argv): yargs.Argv =>
    yargs.options({
      recipient: {
        type: 'string',
        alias: 'r',
        describe: 'Nickname, ENS, or address of the recipient',
        demandOption: true,
      },
      amount: {
        type: 'number',
        alias: 'a',
        describe: 'Number of invites to grant',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: yargs.ArgumentsCamelCase<unknown>): Promise<void> {
    const recipient = new Validator(argv).String('recipient');
    const amount = new Validator(argv).Float('amount');
    const address = await user.interpretName(recipient);
    // TODO: warn user if they are not the ethos admin
    await txn(user.connect.addInvites(address, amount));
  }
}

class BulkSendInvite extends Subcommand {
  public readonly name = 'bulk';
  public readonly description = 'Send invites to multiple users';
  public readonly arguments = (yargs: yargs.Argv): yargs.Argv =>
    yargs.options({
      recipients: {
        type: 'array',
        alias: 'r',
        describe:
          'Nicknames, ENS, or addresses of the recipients (additional -r for each recipient)',
        demandOption: true,
        string: true,
      },
    });

  public async method(user: WalletManager, argv: yargs.ArgumentsCamelCase<unknown>): Promise<void> {
    const recipients = new Validator(argv).Array('recipients');
    const addresses: Address[] = [];

    for (const recipient of recipients) {
      if (typeof recipient === 'string') {
        const address = await user.interpretName(recipient);
        addresses.push(address);
      }
    }

    if (addresses.length === 0) {
      error('No valid addresses provided');

      return;
    }

    out(`📨 Sending invites to: ${addresses.join(', ')}`);
    await txn(user.connect.ethosProfile.bulkInviteAddresses(addresses));
  }
}

export class InviteCommand extends Command {
  public readonly name = 'invite';
  public readonly description = 'Send and receive invitations';
  protected readonly subcommands = [
    new SendInvite(),
    new BulkSendInvite(),
    new AcceptInvite(),
    new RevokeInvite(),
    new GrantInvite(),
  ];
}
