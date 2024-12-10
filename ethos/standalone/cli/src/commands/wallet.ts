import type * as yargs from 'yargs';
import { globals } from '../globals.js';
import { Validator } from '../utils/input.js';
import { out } from '../utils/output.js';
import { type WalletManager } from '../utils/walletManager.js';
import { Command, Subcommand } from './command.js';

class CreateWallet extends Subcommand {
  public readonly name = 'create';
  public readonly description = 'Create a new wallet';
  public readonly arguments = (yargs: yargs.Argv): yargs.Argv =>
    yargs.options({
      nickname: {
        type: 'string',
        alias: 'n',
        describe: 'Nickname for the new wallet',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: yargs.ArgumentsCamelCase<unknown>): Promise<void> {
    const nickname = new Validator(argv).String('nickname');
    await user.create(nickname);
    out(`🆕 Created wallet: ${nickname}`);
  }
}

class ListWallet extends Subcommand {
  public readonly name = 'list';
  public readonly description = 'List all wallets';

  public async method(user: WalletManager): Promise<void> {
    out(`🔗 Wallets: ${user.wallets.map((w) => w.nickname).join(', ')}`);
  }

  public readonly arguments = (yargs: yargs.Argv): yargs.Argv => yargs;
}

async function displayWallet(user: WalletManager): Promise<void> {
  const wallet = await user.info();
  const profile = await user.getEthosProfileId();
  out(`🔗 Address: ${wallet.address}`);
  out(`💰 Balance: ${await user.balance()} ETH`);
  out(`🔑 Profile ID: ${profile ?? 'Not an Ethos User'}`);
}

class WalletInfo extends Subcommand {
  public readonly name = 'info';
  public readonly description = 'Show info about the current wallet';

  public readonly arguments = (yargs: yargs.Argv): yargs.Argv => yargs;

  public async method(user: WalletManager): Promise<void> {
    await displayWallet(user);
  }
}

class LoadWallet extends Subcommand {
  public readonly name = 'load';
  public readonly description = 'Load a wallet';

  public readonly arguments = (yargs: yargs.Argv): yargs.Argv =>
    yargs.options({
      nickname: {
        type: 'string',
        alias: 'n',
        describe: 'Nickname of the wallet to load',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: yargs.ArgumentsCamelCase<unknown>): Promise<void> {
    const nickname = new Validator(argv).String('nickname');
    await user.setActive(nickname);
    out(`🔓 Loaded wallet: ${nickname}`);
    await displayWallet(user);
  }
}

class TransferEth extends Subcommand {
  public readonly name = 'transfer';
  public readonly description = 'Transfer ETH to a recipient';

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
        describe: 'Amount of ETH to transfer',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: yargs.ArgumentsCamelCase<unknown>): Promise<void> {
    const recipient = new Validator(argv).String('recipient');
    const destination = await user.interpretName(recipient);
    const amount = new Validator(argv).Float('amount');
    out(`💸 Transferring ${amount} ETH to: ${recipient}`);

    if (globals.wait) {
      const tx = await user.sendEth(destination, amount);
      out(`🔍 View on Sepolia Basescan: https://sepolia.basescan.org/tx/${tx.hash}`);
    } else {
      void user.sendEth(destination, amount);
      out(`🚀 Transaction initiated. Check your wallet for confirmation.`);
    }
  }
}

export class WalletCommand extends Command {
  public readonly name = 'wallet';
  public readonly description = 'Manage wallets';
  protected readonly subcommands = [
    new CreateWallet(),
    new ListWallet(),
    new LoadWallet(),
    new TransferEth(),
    new WalletInfo(),
  ];
}
