import { type Address, getAddress } from 'viem';
import type yargs from 'yargs';
import { Validator } from '../utils/input';
import { out } from '../utils/output';
import { type WalletManager } from '../utils/walletManager';
import { Command, Subcommand } from './command';

class CreateBulkAddresses extends Subcommand {
  public readonly name = 'create';
  public readonly description = 'Create bulk Ethereum addresses and load initial funds';
  public readonly arguments = (yargs: yargs.Argv): yargs.Argv =>
    yargs.options({
      count: {
        type: 'number',
        alias: 'n',
        describe: 'Number of addresses to create',
        demandOption: true,
      },
      prefix: {
        type: 'string',
        alias: 'p',
        describe: 'Prefix to use to name the addresses',
        default: 'ethos',
      },
      amount: {
        type: 'number',
        alias: 'a',
        describe: 'Amount of ETH to transfer to each address',
        default: 0.005,
      },
    });

  public async method(user: WalletManager, argv: yargs.ArgumentsCamelCase<unknown>): Promise<void> {
    const amount = new Validator(argv).Float('amount');
    const prefix = new Validator(argv).String('prefix');
    const count = new Validator(argv).Integer('count');
    let startIndex = 0;

    // Find the next available index
    const existingNicknames = await user.getNicknames();
    while (existingNicknames.includes(`${prefix}${startIndex}`)) {
      startIndex++;
    }

    for (let i = startIndex; i < startIndex + count; i++) {
      const nickname = `${prefix}${i}`;
      const wallet = await user.create(nickname);
      await transferEth(user, getAddress(wallet.address), amount);
    }
  }
}

async function transferEth(user: WalletManager, recipient: Address, amount: number): Promise<void> {
  out(`💸 Transferring ${amount} ETH to: ${recipient}`);

  const tx = await user.sendEth(recipient, amount);
  out(`🔍 View on Sepolia Basescan: https://sepolia.basescan.org/tx/${tx.hash}`);
}

export class BulkCommand extends Command {
  public readonly name = 'bulk';
  public readonly description = 'Initialize Ethos accounts in bulk';
  protected readonly subcommands = [new CreateBulkAddresses()];
}
