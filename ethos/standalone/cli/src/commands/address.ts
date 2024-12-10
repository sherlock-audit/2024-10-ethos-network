import { type ArgumentsCamelCase, type Argv } from 'yargs';
import { globals } from '../globals.js';
import { getEthosSigner } from '../utils/config.js';
import { Validator } from '../utils/input.js';
import { out, txn } from '../utils/output.js';
import { type WalletManager } from '../utils/walletManager.js';
import { Command, Subcommand } from './command.js';

class ListAddresses extends Subcommand {
  public readonly name = 'list';
  public readonly description = 'List your addresses';
  public readonly arguments = (yargs: Argv): Argv => yargs;

  public async method(user: WalletManager): Promise<void> {
    const profileId = await user.getEthosProfileId();

    if (!profileId) {
      out(`Current user does not have an Ethos profile`);

      return;
    }

    const addresses = await user.connect.ethosProfile.addressesForProfile(profileId);

    addresses.forEach((address, index) => {
      out(`${index}: ${address}`);
    });
  }
}

class RegisterAddress extends Subcommand {
  public readonly name = 'register';
  public readonly description = 'Register an address for a profile';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.option('address', {
      type: 'string',
      alias: 'a',
      description: 'Nickname, ENS, or address to register',
      demandOption: true,
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const profileId = await user.getEthosProfileId();
    const addressInput = new Validator(argv).String('address');
    const address = await user.interpretName(addressInput);

    if (!profileId) {
      out('Current user does not have an Ethos profile');

      return;
    }

    const signer = getEthosSigner();
    const { randValue, signature } = await user.connect.createSignatureForRegisterAddress(
      profileId,
      address,
      signer.privateKey,
    );

    if (globals.verbose) {
      out(`🪧 Registering address ${address} for profile ${profileId}`);
    }

    await txn(user.connect.ethosProfile.registerAddress(address, profileId, randValue, signature));
    out(`🪧 Address registered`);
  }
}

class CheckCompromise extends Subcommand {
  public readonly name = 'check';
  public readonly description = 'Check if an address is marked compromised';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.option('address', {
      type: 'string',
      alias: 'a',
      description: 'Nickname, ENS, or address to check',
      demandOption: true,
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const addressInput = new Validator(argv).String('address');
    const address = await user.interpretName(addressInput);
    const compromised = await user.connect.ethosProfile.contract.isAddressCompromised(address);

    if (globals.verbose) {
      out(`Checking if ${addressInput} is compromised`);
    }
    out(`Address: ${address}`);
    out(`Compromised: ${compromised}`);
  }
}

class DeleteAddress extends Subcommand {
  public readonly name = 'delete';
  public readonly description = 'Delete an address from your profile';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      address: {
        type: 'string',
        alias: 'a',
        description: 'Nickname, ENS, or address to delete',
        demandOption: true,
      },
      markAsCompromised: {
        type: 'boolean',
        alias: 'm',
        description: 'Whether to mark the address as compromised',
        default: false,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const addressInput = new Validator(argv).String('address');
    const address = await user.interpretName(addressInput);
    const markAsCompromised = new Validator(argv).Boolean('markAsCompromised');

    if (globals.verbose) {
      out(`🚮 Deleting address ${address}`);

      if (markAsCompromised) {
        out('⚠️ Address will be marked as compromised');
      }
    }
    await txn(user.connect.ethosProfile.deleteAddress(address, markAsCompromised));
    out(`🗑️ Address deleted`);
  }
}

export class AddressCommand extends Command {
  public readonly name = 'address';
  public readonly description = 'Manage addresses for your profile';
  protected readonly subcommands = [
    new ListAddresses(),
    new CheckCompromise(),
    new RegisterAddress(),
    new DeleteAddress(),
  ];
}
