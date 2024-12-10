import { contracts } from '@ethos/contracts';
import type * as yargs from 'yargs';
import { ETHOS_ENV } from '../utils/config.js';
import { out } from '../utils/output.js';
import { type WalletManager } from '../utils/walletManager.js';
import { Command, Subcommand } from './command.js';

class ListContracts extends Subcommand {
  public readonly name = 'list';
  public readonly description = 'List all contract addresses';

  public readonly arguments = (yargs: yargs.Argv): yargs.Argv => yargs;

  public async method(user: WalletManager): Promise<void> {
    out(`📜 Smart Contract Addresses (${ETHOS_ENV}):`);

    const maxLength = Math.max(...contracts.map((c) => c.length));

    for (const contract of contracts) {
      const address = user.connect.getContractAddress(contract);
      const etherscanLink = `https://sepolia.basescan.org/address/${address}`;
      out(`${contract.padEnd(maxLength)}  ${etherscanLink}`);
    }
  }
}

export class ContractsCommand extends Command {
  public readonly name = 'contracts';
  public readonly description = 'Display smart contract addresses';
  protected readonly subcommands = [new ListContracts()];
}
