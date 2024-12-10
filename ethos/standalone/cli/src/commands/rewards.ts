import { isValidAddress } from '@ethos/helpers';
import { formatEther } from 'ethers';
import { type Argv } from 'yargs';
import { out, txn } from '../utils/output.js';
import { type WalletManager } from '../utils/walletManager.js';
import { Command, Subcommand } from './command.js';

class CheckBalance extends Subcommand {
  public readonly name = 'balance';
  public readonly description = 'Check the balance in Ethos rewards';
  public readonly arguments = (yargs: Argv): Argv => yargs;

  public async method(user: WalletManager): Promise<void> {
    const profileId = await user.getEthosProfileId();

    if (!profileId) {
      out('❌ No profile found for the current wallet');

      return;
    }

    const balance = await user.connect.ethosVouch.getRewardsBalance(profileId);

    out(`💰 Your Ethos rewards pending:`);
    out(`   Amount: ${formatEther(balance.balance)} ETH`);
  }
}

class Withdraw extends Subcommand {
  public readonly name = 'withdraw';
  public readonly description = 'Withdraw rewards from Ethos';
  public readonly arguments = (yargs: Argv): Argv => yargs;

  public async method(user: WalletManager): Promise<void> {
    const profileId = await user.getEthosProfileId();

    if (!profileId) {
      out('❌ No profile found for the current wallet');

      return;
    }

    const balance = await user.connect.ethosVouch.getRewardsBalance(profileId);

    if (balance.balance === '0') {
      out('❌ No rewards available to withdraw');

      return;
    }

    const wallet = await user.getActiveWallet();

    if (!wallet || !isValidAddress(wallet.address)) {
      out('❌ No active wallet found');

      return;
    }

    out(`🏧 Withdrawing ${formatEther(balance.balance)} ETH from Ethos rewards`);
    await txn(user.connect.ethosVouch.claimRewards());
  }
}

export class RewardsCommand extends Command {
  public readonly name = 'rewards';
  public readonly description = 'Manage Ethos rewards';
  public readonly subcommands = [new CheckBalance(), new Withdraw()];
}
