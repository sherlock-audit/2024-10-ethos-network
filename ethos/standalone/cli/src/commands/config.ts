import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import pc from 'picocolors';
import { type ArgumentsCamelCase, type Argv } from 'yargs';
import { globals } from '../globals.js';
import { ETHOS_ENV, ETHOS_ENV_FILE } from '../utils/config.js';
import { Validator } from '../utils/input.js';
import { out } from '../utils/output.js';
import { type WalletManager } from '../utils/walletManager.js';
import { Command, Subcommand } from './command.js';

class SetAlchemyApiKey extends Subcommand {
  public readonly name = 'set-alchemy-key';
  public readonly description = 'Set the Alchemy API key';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      key: {
        type: 'string',
        alias: 'k',
        describe: 'Alchemy API key',
        demandOption: true,
      },
    });

  public async method(_user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const key = new Validator(argv).String('key');
    updateEnvFile('ALCHEMY_API_KEY', key);
    out(`✅ Alchemy API key updated successfully`);
  }
}

class SetAlchemyTestnetUrl extends Subcommand {
  public readonly name = 'set-alchemy-testnet-url';
  public readonly description = 'Set the Alchemy testnet API URL';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      url: {
        type: 'string',
        alias: 'u',
        describe: 'Alchemy testnet API URL',
        demandOption: true,
      },
    });

  public async method(_user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const url = new Validator(argv).String('url');
    updateEnvFile('ALCHEMY_TESTNET_API_URL', url);
    out(`✅ Alchemy testnet API URL updated successfully`);
  }
}

class SetSignerPrivateKey extends Subcommand {
  public readonly name = 'set-signer-key';
  public readonly description = 'Set the signer account private key';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      key: {
        type: 'string',
        alias: 'k',
        describe: 'Signer account private key',
        demandOption: true,
      },
    });

  public async method(_user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const key = new Validator(argv).String('key');
    updateEnvFile('SIGNER_ACCOUNT_PRIVATE_KEY', key);
    out(`✅ Signer account private key updated successfully`);
  }
}

class GetConfig extends Subcommand {
  public readonly name = 'list';
  public readonly description = 'List current configuration values';
  public readonly arguments = (yargs: Argv): Argv => yargs;

  public async method(_user: WalletManager, _argv: ArgumentsCamelCase<unknown>): Promise<void> {
    let config: dotenv.DotenvParseOutput = {};

    if (fs.existsSync(ETHOS_ENV_FILE)) {
      config = dotenv.parse(fs.readFileSync(ETHOS_ENV_FILE));
    }

    if (globals.verbose) {
      out(`📝 Using configuration file: ${ETHOS_ENV_FILE}`);
    }

    out('📋 Current Configuration:');

    const configItems = [
      { key: 'ETHOS_CLI_ENV', value: ETHOS_ENV },
      { key: 'ALCHEMY_API_KEY', value: process.env.ALCHEMY_API_KEY ?? config.ALCHEMY_API_KEY },
      {
        key: 'ALCHEMY_TESTNET_API_URL',
        value: process.env.ALCHEMY_TESTNET_API_URL ?? config.ALCHEMY_TESTNET_API_URL,
      },
      {
        key: 'SIGNER_ACCOUNT_PRIVATE_KEY',
        value: process.env.SIGNER_ACCOUNT_PRIVATE_KEY ?? config.SIGNER_ACCOUNT_PRIVATE_KEY,
        sensitive: true,
      },
    ];
    const NOT_SET = 'Not set';
    configItems.forEach(({ key, value, sensitive }) => {
      const displayValue = sensitive ? (value ? '********' : NOT_SET) : (value ?? NOT_SET);
      out(`   ${key}: ${displayValue}`, displayValue === NOT_SET ? pc.red : pc.green);
    });
  }
}

function updateEnvFile(key: string, value: string): void {
  let envConfig: dotenv.DotenvParseOutput = {};

  const envDir = path.dirname(ETHOS_ENV_FILE);

  if (!fs.existsSync(envDir)) {
    fs.mkdirSync(envDir, { recursive: true });
  }

  if (fs.existsSync(ETHOS_ENV_FILE)) {
    envConfig = dotenv.parse(fs.readFileSync(ETHOS_ENV_FILE));
  }

  envConfig[key] = value;
  const newEnvContent = Object.entries(envConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(ETHOS_ENV_FILE, newEnvContent);

  if (globals.verbose) {
    out(`📝 Updated ${ETHOS_ENV_FILE} with ${key}=${value}`);
  }
}

export class ConfigCommand extends Command {
  public readonly name = 'config';
  public readonly description = 'Manage Ethos CLI configuration';
  public readonly subcommands = [
    new SetAlchemyApiKey(),
    new SetAlchemyTestnetUrl(),
    new SetSignerPrivateKey(),
    new GetConfig(),
  ];
}
