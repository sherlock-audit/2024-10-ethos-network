#!/usr/bin/env node

import yargs from 'yargs';
import { AddressCommand } from './commands/address';
import { AttestationCommand } from './commands/attestation';
import { BulkCommand } from './commands/bulk';
import { ConfigCommand } from './commands/config';
import { ContractsCommand } from './commands/contracts';
import { InviteCommand } from './commands/invite';
import { MarketCommand } from './commands/market';
import { ProfileCommand } from './commands/profile';
import { ReplyCommand } from './commands/reply';
import { ReviewCommand } from './commands/review';
import { RewardsCommand } from './commands/rewards';
import { UtilsCommand } from './commands/utils';
import { VoteCommand } from './commands/vote';
import { VouchCommand } from './commands/vouch';
import { WalletCommand } from './commands/wallet';
import { verboseOption, waitOption, updateGlobals } from './globals';
import { WalletManager } from './utils/walletManager';

async function main(): Promise<void> {
  const user = await WalletManager.initialize();

  const addressCommand = new AddressCommand(user);
  const attestationCommand = new AttestationCommand(user);
  const bulkCommand = new BulkCommand(user);
  const configCommand = new ConfigCommand(user);
  const contractsCommand = new ContractsCommand(user);
  const inviteCommand = new InviteCommand(user);
  const marketCommand = new MarketCommand(user);
  const profileCommand = new ProfileCommand(user);
  const replyCommand = new ReplyCommand(user);
  const reviewCommand = new ReviewCommand(user);
  const rewardsCommand = new RewardsCommand(user);
  const utilsCommand = new UtilsCommand(user);
  const voteCommand = new VoteCommand(user);
  const vouchCommand = new VouchCommand(user);
  const walletCommand = new WalletCommand(user);

  await yargs()
    .scriptName('ethos')
    .option('verbose', verboseOption)
    .option('wait', waitOption)
    .middleware(updateGlobals)
    .command(addressCommand.build())
    .command(attestationCommand.build())
    .command(bulkCommand.build())
    .command(configCommand.build())
    .command(contractsCommand.build())
    .command(inviteCommand.build())
    .command(marketCommand.build())
    .command(profileCommand.build())
    .command(replyCommand.build())
    .command(reviewCommand.build())
    .command(rewardsCommand.build())
    .command(utilsCommand.build())
    .command(voteCommand.build())
    .command(vouchCommand.build())
    .command(walletCommand.build())
    .demandCommand(1, 'You must specify a command')
    .strict()
    .help(false)
    .version(false)
    .parse(process.argv.slice(2));
}

main().catch((err) => {
  console.error('Error: ' + String(err));
});
