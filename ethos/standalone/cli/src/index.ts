#!/usr/bin/env node --no-warnings=ExperimentalWarning

import yargs from 'yargs';
import { AddressCommand } from './commands/address.js';
import { AttestationCommand } from './commands/attestation.js';
import { BulkCommand } from './commands/bulk.js';
import { ConfigCommand } from './commands/config.js';
import { ContractsCommand } from './commands/contracts.js';
import { InviteCommand } from './commands/invite.js';
import { MarketCommand } from './commands/market.js';
import { ProfileCommand } from './commands/profile.js';
import { ReplyCommand } from './commands/reply.js';
import { ReviewCommand } from './commands/review.js';
import { RewardsCommand } from './commands/rewards.js';
import { UtilsCommand } from './commands/utils.js';
import { VoteCommand } from './commands/vote.js';
import { VouchCommand } from './commands/vouch.js';
import { WalletCommand } from './commands/wallet.js';
import { verboseOption, waitOption, updateGlobals } from './globals.js';
import { WalletManager } from './utils/walletManager.js';

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
