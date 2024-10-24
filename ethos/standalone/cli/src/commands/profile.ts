import yargs, { type ArgumentsCamelCase, type Argv } from 'yargs';
import { Validator } from '../utils/input';
import { error, f, out, txn } from '../utils/output';
import { type WalletManager } from '../utils/walletManager';
import { Command, Subcommand } from './command';

class ArchiveProfile extends Subcommand {
  public readonly name = 'archive';
  public readonly description = 'Archive your profile';
  public readonly arguments = (yargs: Argv): Argv => yargs;

  public async method(user: WalletManager): Promise<void> {
    const getProfileId: number | null = await user.getEthosProfileId();

    const profileId: number = getProfileId ?? 0;

    if (profileId === 0) {
      out(`invalid profileId`);

      return;
    }

    const getProfile = await user.connect.getProfile(profileId);
    const profile = getProfile ?? { archived: true };

    if (profile.archived) {
      out(`profile id: ${profileId} is already archived or invalid`);
    } else {
      out(`🪦 archiving profile id: ${profileId}`);
      await txn(user.connect.ethosProfile.archiveProfile());
    }
  }
}

class RestoreProfile extends Subcommand {
  public readonly name = 'restore';
  public readonly description = 'Restore your archived profile';
  public readonly arguments = (yargs: Argv): Argv => yargs;

  public async method(user: WalletManager): Promise<void> {
    const getProfileId: number | null = await user.getEthosProfileId();

    const profileId: number = getProfileId ?? 0;

    if (profileId === 0) {
      out(`invalid profileId`);

      return;
    }

    const getProfile = await user.connect.getProfile(profileId);
    const profile = getProfile ?? { archived: true };

    if (!profile.archived) {
      out(`profile id: ${profileId} is already active`);
    } else {
      out(`restoring profile id: ${profileId}`);
      await txn(user.connect.ethosProfile.restoreProfile());
    }
  }
}

class Lookup extends Subcommand {
  public readonly name = 'lookup';
  public readonly description = 'Check the status of an address, nickname, ENS, or profile id';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs
      .option('identifier', {
        type: 'string',
        alias: 'i',
        description: 'The address, nickname, or ENS to lookup',
        default: '',
      })
      .option('profile-id', {
        type: 'number',
        alias: 'p',
        description: 'The profile ID to lookup',
        default: 0,
      });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const identifier = new Validator(argv).String('identifier');
    const profileId = new Validator(argv).Integer('profile-id');
    let status: {
      verified: boolean;
      archived: boolean;
      mock: boolean;
      profileId?: number;
    };

    if (profileId !== 0) {
      status = await user.connect.ethosProfile.getProfileStatusById(profileId);
      status.profileId = profileId;
    } else if (identifier !== '') {
      const address = await user.interpretName(identifier);
      status = await user.connect.ethosProfile.getProfileStatusByAddress(address);
    } else {
      yargs.help();
      error('Must specify either a profile ID or an identifier (address, nickname, or ENS)');

      return;
    }

    if (status.profileId === 0) {
      out('No profile found');

      return;
    }

    out(`Profile ${status.profileId}:`);
    out(f('Registered:', status.verified ? 'Yes' : 'No'));
    out(f('Status:', status.archived ? 'Archived' : 'Active'));
    out(f('Type:', status.mock ? 'Mock profile' : 'Real profile'));

    if (status.verified && status.profileId) {
      const profile = await user.connect.ethosProfile.getProfile(status.profileId);

      if (profile) {
        out(f('Created At:', profile.createdAt.toString()));
        out('  Addresses:');
        profile.addresses.forEach((address, index) => {
          out(f(`  ${index}:`, address.toString()));
        });
        out('  Invite Info:');
        out(f('  Invited By:', profile.inviteInfo.invitedBy.toString()));
        out(f('  Sent:', `${profile.inviteInfo.sent.length} invites`));
        out(f('  Accepted IDs:', `${profile.inviteInfo.acceptedIds.length} profiles`));
        out(f('  Available:', profile.inviteInfo.available.toString()));
      }
    }
  }
}

export class ProfileCommand extends Command {
  public readonly name = 'profile';
  public readonly description = 'Manage your Ethos profile';
  protected readonly subcommands = [new Lookup(), new ArchiveProfile(), new RestoreProfile()];
}
