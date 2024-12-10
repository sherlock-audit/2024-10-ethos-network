import { formatEther, type Provider } from 'ethers';
import { type Address } from 'viem';
import { type ArgumentsCamelCase, type Argv } from 'yargs';
import { globals } from '../globals.js';
import { Validator } from '../utils/input.js';
import { out } from '../utils/output.js';
import { type WalletManager } from '../utils/walletManager.js';
import { Command, Subcommand } from './command.js';

const ETH_FOR_INVITE = 0.01;
const ETH_FOR_CREATED = 0.05;

class SendEthToInvitedUsers extends Subcommand {
  public readonly name = 'send-to-invited';
  public readonly description = 'Send 0.01 ETH to recently invited users';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      limit: {
        type: 'number',
        alias: 'l',
        describe: 'Number of recent invites to process',
        default: 0,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const limit = new Validator(argv).Integer('limit');
    let count = 0;

    out('💸 Sending 0.01 ETH to recently invited users:');

    try {
      const provider = user.connect.ethosProfile.contractRunner.provider;

      if (!provider) {
        throw new Error('No provider available');
      }
      const numProfiles = await user.connect.ethosProfile.getProfileCount();

      for (let i = numProfiles; i >= 1; i--) {
        if (globals.verbose) {
          out(`🔃 Processing invites from profile ${i} of ${numProfiles}...`);
        }
        try {
          const invites = await user.connect.ethosProfile.sentInvitationsForProfile(i);

          for (let j = 0; j < invites.length; j++) {
            if (globals.verbose) {
              out(`🔃 Processing profile ${i} invite ${j} of ${invites.length}...`);
            }
            const sent = await sendEthToAddress(user, invites[j], ETH_FOR_INVITE, provider);

            if (sent) {
              count++;
            }
            if (limit > 0 && count >= limit) {
              out(`🔚 Reached limit of ${limit}.`);

              return;
            }
          }
        } catch (err) {
          out(`❌ Error processing invites from profile ${i}: ${String(err)}`);
        }
      }
    } catch (error) {
      out(`❌ Error sending ETH to invited users: ${String(error)}`);
    }
  }
}

class SendEthToCreatedProfiles extends Subcommand {
  public readonly name = 'send-to-profiles';
  public readonly description = 'Send 0.05 ETH to recently created profiles';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      limit: {
        type: 'number',
        alias: 'l',
        describe: 'Number of recent profiles to process',
        default: 0,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const limit = new Validator(argv).Integer('limit');
    let count = 0;
    out('💸 Sending 0.05 ETH to recently created profiles:');
    try {
      const provider = user.connect.ethosProfile.contractRunner.provider;

      if (!provider) {
        throw new Error('No provider available');
      }
      const numProfiles = await user.connect.ethosProfile.getProfileCount();
      out(`🔢 Total profiles: ${numProfiles}`);

      for (let i = numProfiles; i >= 1; i--) {
        if (limit > 0 && count >= limit) {
          out(`🔚 Reached limit of ${limit}.`);
          break;
        }
        if (globals.verbose) {
          out(`🔃 Processing profile ${numProfiles - i + 1} of ${numProfiles}...`);
        }
        try {
          const addresses = await user.connect.ethosProfile.addressesForProfile(i);

          for (const address of addresses) {
            const sent = await sendEthToAddress(user, address, ETH_FOR_CREATED, provider);

            if (sent) {
              count++;
            }
          }
        } catch (err) {
          out(`❌ Error loading profile ${i}: ${String(err)}`);
        }
      }
    } catch (error) {
      out(`❌ Error sending ETH to created profiles: ${String(error)}`);
    }
  }
}

export class UtilsCommand extends Command {
  public readonly name = 'utils';
  public readonly description = 'Utility commands for Ethos';
  protected readonly subcommands = [new SendEthToInvitedUsers(), new SendEthToCreatedProfiles()];
}

async function sendEthToAddress(
  user: WalletManager,
  address: Address,
  targetAmount: number,
  provider: Provider,
): Promise<boolean> {
  const balance = await provider.getBalance(address);
  const balanceInEth = parseFloat(formatEther(balance));

  if (balanceInEth >= targetAmount) {
    out(`⏭️  Skipping ${address}: Already has >= ${targetAmount} ETH.`);

    return false;
  }
  out(`🤑 Address: ${address} has ${balanceInEth} ETH.`);

  const ethToSend = targetAmount - balanceInEth;

  if (ethToSend <= 0.001) {
    out(`⏭️ Skipping ${address}: Amount to send is too small. Don't send dust.`);

    return false;
  }
  out(`📤 Sending ${ethToSend.toFixed(5)} ETH to ${address}...`);
  const tx = await user.sendEth(address, Number(ethToSend.toFixed(5)));

  if (globals.verbose) {
    out(`🚀 Sent ${tx.hash}`);
  }
  if (tx.status !== 1) {
    out(`❌ Transaction failed: ${tx.status}`);

    return false;
  }

  return true;
}
