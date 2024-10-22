import { formatDate } from '@ethos/helpers';
import { formatEther } from 'ethers';
import { zeroAddress } from 'viem';
import { type ArgumentsCamelCase, type Argv } from 'yargs';
import { Validator } from '../utils/input';
import { out, txn, error } from '../utils/output';
import { type WalletManager } from '../utils/walletManager';
import { Command, Subcommand } from './command';

class Vouch extends Subcommand {
  public readonly name = 'vouch';
  public readonly description = 'Vouch for a subject';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      subject: {
        type: 'string',
        alias: 's',
        describe: 'Nickname, ENS, or address of the subject',
        demandOption: true,
      },
      amount: {
        type: 'string',
        alias: 'a',
        describe: 'Amount to vouch',
        demandOption: true,
      },
      comment: {
        type: 'string',
        alias: 'c',
        describe: 'Vouch comment',
        default: '',
      },
      description: {
        type: 'string',
        alias: 'd',
        describe: 'Vouch description',
        default: '',
        demandOption: false,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const subject = new Validator(argv).String('subject');
    const amount = new Validator(argv).Float('amount');
    const comment = new Validator(argv).String('comment');
    const description = new Validator(argv).String('description');
    const address = await user.interpretName(subject);
    const metadata = description ? JSON.stringify({ description }) : '';
    out(`🤝 Vouching for: ${subject}`);
    await txn(user.connect.vouchByAddress(address, zeroAddress, String(amount), comment, metadata));
  }
}

class Unvouch extends Subcommand {
  public readonly name = 'unvouch';
  public readonly description = 'Remove a vouch';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      vouchId: {
        type: 'number',
        alias: 'i',
        describe: 'ID of the vouch to remove',
        demandOption: true,
      },
      unhealthy: {
        type: 'boolean',
        alias: 'u',
        describe: 'Mark the unvouching as unhealthy',
        default: false,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const vouchId = new Validator(argv).Integer('vouchId');
    const unhealthy = new Validator(argv).Boolean('unhealthy');
    out(`👋 Removing vouch: ${vouchId}`);

    if (unhealthy) {
      await txn(user.connect.unvouchUnhealthy(vouchId));
    } else {
      await txn(user.connect.unvouch(vouchId));
    }
  }
}

class ListVouches extends Subcommand {
  public readonly name = 'list';
  public readonly description = 'List vouches for the current wallet';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      status: {
        type: 'string',
        alias: 's',
        describe: 'Filter vouches by status',
        choices: ['active', 'archived', 'all'],
        default: 'active',
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const status = new Validator(argv).String('status');
    const profileId = await user.getEthosProfileId();

    if (!profileId) {
      out('❌ No profile found for the current wallet');

      return;
    }

    const vouches = await user.connect.getAllVouchesByAuthor(profileId);

    if (vouches.length === 0) {
      out('No vouches found for the current wallet');

      return;
    }
    const filteredVouches = vouches.filter((vouch) => {
      if (status === 'active') return !vouch.archived;
      if (status === 'archived') return vouch.archived;

      return true; // 'all' status
    });

    if (filteredVouches.length === 0) {
      out(`No ${status} vouches found for the current wallet`);

      return;
    }

    out(`🤝 Your vouches:`);

    for (const vouch of filteredVouches) {
      let balance = '';
      try {
        balance = (await user.connect.ethosVouch.getBalanceByVouchId(vouch.id)).toString();
      } catch (error) {
        // ignore
      }
      out(`
ID:                 ${vouch.id.toString().padEnd(10)}
Subject Profile ID: ${vouch.subjectProfileId.toString().padEnd(10)}
Archived:           ${vouch.archived.toString().padEnd(10)}
Unhealthy:          ${vouch.unhealthy.toString().padEnd(10)}
Comment:            ${vouch.comment.padEnd(30)}
Vouched At:         ${formatDate(new Date(vouch.activityCheckpoints.vouchedAt * 1000)).padEnd(20)}
Balance:            ${balance || '-'} ETH
      `);
    }
  }
}

class Balance extends Subcommand {
  public readonly name = 'balance';
  public readonly description = 'Show the balance of a vouch';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      vouchId: {
        type: 'number',
        alias: 'i',
        describe: 'ID of the vouch to check balance',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const vouchId = new Validator(argv).Integer('vouchId');
    const vouch = await user.connect.getVouch(vouchId);

    if (!vouch) {
      out(`❌ Vouch with ID ${vouchId} not found`);

      return;
    }

    const balance = await user.connect.ethosVouch.getBalanceByVouchId(vouch.id);

    out(`💰 Balance for vouch ID ${vouchId}:`);
    out(`   Amount: ${balance} ETH`);
    out(`   Subject: ${vouch.subjectProfileId}`);
    out(`   Status: ${vouch.archived ? 'Archived' : 'Active'}`);
  }
}

class VouchTransfers extends Subcommand {
  public readonly name = 'transfers';
  public readonly description = 'Show ETH transfers for a vouch transaction';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      txHash: {
        type: 'string',
        alias: 't',
        describe: 'Transaction hash of the vouch',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const txHash = new Validator(argv).String('txHash');

    out(`🔍 Fetching ETH transfers for transaction: ${txHash}`);

    try {
      const { transaction, transfer } = await user.connect.getVouchEthTransfers(txHash);

      out(`Transaction details:`);
      out(`   From: ${transaction.from}`);
      out(`   To: ${transaction.to}`);
      out(`   Value: ${formatEther(transaction.value)} ETH`);

      out(`\nWETH Transfers:`);
      out(`   Deposit: ${transfer.deposit}`);
      out(`   Withdraw: ${transfer.withdraw}`);
    } catch (err) {
      error(`Failed to fetch vouch transfers: ${String(err)}`);
    }
  }
}

export class VouchCommand extends Command {
  public readonly name = 'vouch';
  public readonly description = 'Vouch for Ethos users';
  public readonly subcommands = [
    new Vouch(),
    new Unvouch(),
    new ListVouches(),
    new Balance(),
    new VouchTransfers(),
  ];
}
