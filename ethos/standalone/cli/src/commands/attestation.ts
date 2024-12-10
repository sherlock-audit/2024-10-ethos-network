import { type AttestationService } from '@ethos/blockchain-manager';
import { type ArgumentsCamelCase, type Argv } from 'yargs';
import { globals } from '../globals.js';
import { getEthosSigner } from '../utils/config.js';
import { Validator } from '../utils/input.js';
import { out, txn } from '../utils/output.js';
import { type WalletManager } from '../utils/walletManager.js';
import { Command, Subcommand } from './command.js';

class CreateAttestation extends Subcommand {
  public readonly name = 'create';
  public readonly description = 'Create a new attestation';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      service: {
        type: 'string',
        alias: 's',
        describe: 'Service name (e.g., x.com)',
        default: 'x.com',
      },
      account: {
        type: 'string',
        alias: 'a',
        describe: 'Account name',
        demandOption: true,
      },
      evidence: {
        type: 'string',
        alias: 'e',
        describe: 'Evidence of attestation',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const service = new Validator(argv).String('service') as AttestationService;
    const account = new Validator(argv).String('account');
    const evidence = new Validator(argv).String('evidence');
    const profileId = await user.getEthosProfileId();

    if (!profileId) {
      out('❌ No profile found for the current wallet');

      return;
    }

    const signer = getEthosSigner();
    const { randValue, signature } = await user.connect.createSignatureForCreateAttestation(
      profileId,
      account,
      service,
      evidence,
      signer.privateKey,
    );

    out(`🪧 Creating attestation for ${service}/${account}`);
    await txn(
      user.connect.ethosAttestation.createAttestation(
        profileId,
        randValue,
        { service, account },
        evidence,
        signature,
      ),
    );
  }
}

class ArchiveAttestation extends Subcommand {
  public readonly name = 'archive';
  public readonly description = 'Archive an attestation';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      service: {
        type: 'string',
        alias: 's',
        describe: 'Service name (e.g., x.com)',
        demandOption: true,
      },
      account: {
        type: 'string',
        alias: 'a',
        describe: 'Account name',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const service = new Validator(argv).String('service') as AttestationService;
    const account = new Validator(argv).String('account');

    out(`🗄️ Archiving attestation for ${service}/${account}`);
    await txn(user.connect.ethosAttestation.archiveAttestation(service, account));
  }
}

class RestoreAttestation extends Subcommand {
  public readonly name = 'restore';
  public readonly description = 'Restore an archived attestation';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      service: {
        type: 'string',
        alias: 's',
        describe: 'Service name (e.g., x.com)',
        demandOption: true,
      },
      account: {
        type: 'string',
        alias: 'a',
        describe: 'Account name',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const service = new Validator(argv).String('service') as AttestationService;
    const account = new Validator(argv).String('account');

    out(`🔄 Restoring attestation for ${service}/${account}`);
    await txn(user.connect.ethosAttestation.restoreAttestation(service, account));
  }
}

class GetAttestation extends Subcommand {
  public readonly name = 'get';
  public readonly description = 'Get attestation details';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      service: {
        type: 'string',
        alias: 's',
        describe: 'Service name (e.g., x.com)',
        default: 'x.com',
      },
      account: {
        type: 'string',
        alias: 'a',
        describe: 'Account ID (note: not twitter handle)',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const service = new Validator(argv).String('service') as AttestationService;
    const account = new Validator(argv).String('account');

    const hash = user.connect.ethosAttestation.hash(service, account);

    if (globals.verbose) out(`Lookup attestation service: ${service} account: ${account}`);
    if (globals.verbose) out(`Attestation hash: ${hash}`);
    const exists = await user.connect.ethosAttestation.attestationExistsForHash(hash);
    const attestation = await user.connect.ethosAttestation.attestationByHash(hash);

    if (!exists) {
      out('❌ Attestation not found');

      return;
    }

    out('Attestation details:');
    out(`ID: ${attestation.id}`);
    out(`Service: ${attestation.service}`);
    out(`Account: ${attestation.account}`);
    out(`Profile ID: ${attestation.profileId}`);
    out(`Created At: ${new Date(attestation.createdAt * 1000).toLocaleString()}`);
    out(`Archived: ${attestation.archived}`);
  }
}

class ListAttestations extends Subcommand {
  public readonly name = 'list';
  public readonly description = 'List your attestations';
  public readonly arguments = (yargs: Argv): Argv => yargs;

  public async method(user: WalletManager, _argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const profileId = await user.getEthosProfileId();

    if (!profileId) {
      out('❌ No profile found for the current wallet');

      return;
    }

    const attestationHashes =
      await user.connect.ethosAttestation.getAttestationHashesByProfileId(profileId);

    if (attestationHashes.length === 0) {
      out('No attestations found for the current profile');

      return;
    }

    out(`🔖 Your attestations:`);

    for (const hash of attestationHashes) {
      const attestation = await user.connect.ethosAttestation.attestationByHash(hash);
      out(`
Hash:       ${attestation.hash}
ID:         ${attestation.id}
Service:    ${attestation.service}
Account:    ${attestation.account}
Created At: ${new Date(attestation.createdAt * 1000).toLocaleString()}
Archived:   ${attestation.archived}
      `);
    }
  }
}

export class AttestationCommand extends Command {
  public readonly name = 'attest';
  public readonly description = 'Manage Ethos attestations';
  public readonly subcommands = [
    new ListAttestations(),
    new GetAttestation(),
    new CreateAttestation(),
    new ArchiveAttestation(),
    new RestoreAttestation(),
  ];
}
