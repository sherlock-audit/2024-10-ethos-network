import { ESCROW_TOKEN_ADDRESS } from '@ethos/blockchain-manager';
import { isValidAddress } from '@ethos/helpers';
import { formatEther } from 'ethers';
import { getAddress } from 'viem';
import { type ArgumentsCamelCase, type Argv } from 'yargs';
import { Validator } from '../utils/input';
import { out, txn } from '../utils/output';
import { type WalletManager } from '../utils/walletManager';
import { Command, Subcommand } from './command';

class CheckBalance extends Subcommand {
  public readonly name = 'balance';
  public readonly description = 'Check the balance in Ethos rewards escrow';
  public readonly arguments = (yargs: Argv): Argv => yargs;

  public async method(user: WalletManager): Promise<void> {
    const profileId = await user.getEthosProfileId();

    if (!profileId) {
      out('❌ No profile found for the current wallet');

      return;
    }

    const balance = await user.connect.getEscrowBalance(profileId, ESCROW_TOKEN_ADDRESS);

    out(`💰 Your Ethos escrow rewards pending:`);
    out(`   Amount: ${formatEther(balance.balance)} ETH`);
  }
}

class Withdraw extends Subcommand {
  public readonly name = 'withdraw';
  public readonly description = 'Withdraw rewards from Ethos escrow';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      amount: {
        type: 'string',
        alias: 'a',
        describe: 'Amount to withdraw (in ETH)',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const amount = new Validator(argv).Float('amount');
    const profileId = await user.getEthosProfileId();

    if (!profileId) {
      out('❌ No profile found for the current wallet');

      return;
    }

    const balance = await user.connect.getEscrowBalance(profileId, ESCROW_TOKEN_ADDRESS);

    if (parseFloat(formatEther(balance.balance)) < amount) {
      out(`❌ Insufficient rewards. Your current balance is ${formatEther(balance.balance)} ETH`);

      return;
    }

    const wallet = await user.getActiveWallet();

    if (!wallet || !isValidAddress(wallet.address)) {
      out('❌ No active wallet found');

      return;
    }

    out(`🏧 Withdrawing ${amount} ETH from Ethos rewards escrow`);
    await txn(
      user.connect.withdrawFromEscrow(ESCROW_TOKEN_ADDRESS, wallet.address, amount.toString()),
    );
  }
}

class Deposit extends Subcommand {
  public readonly name = 'deposit';
  public readonly description = 'Deposit rewards to Ethos escrow';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      amount: {
        type: 'string',
        alias: 'a',
        describe: 'Amount to deposit (in ETH)',
        demandOption: true,
      },
      token: {
        type: 'string',
        alias: 't',
        describe: 'Token address to deposit',
        default: ESCROW_TOKEN_ADDRESS,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const amount = new Validator(argv).Float('amount');
    const profileId = await user.getEthosProfileId();
    const token = getAddress(String(argv.token));

    if (!profileId) {
      out('❌ No profile found for the current wallet');

      return;
    }

    out(`💰 Depositing ${amount} ETH to Ethos rewards escrow`);

    if (argv.token === ESCROW_TOKEN_ADDRESS) {
      await txn(user.connect.ethosEscrow.depositETH(amount.toString()));
    } else {
      await txn(user.connect.ethosEscrow.deposit(token, amount.toString()));
    }
  }
}

export class RewardsCommand extends Command {
  public readonly name = 'rewards';
  public readonly description = 'Manage Ethos rewards';
  public readonly subcommands = [new CheckBalance(), new Withdraw(), new Deposit()];
}
