import yargs, { type ArgumentsCamelCase, type CommandModule, type CommandBuilder } from 'yargs';
import { globals } from '../globals.js';
import { type WalletManager } from '../utils/walletManager.js';

/**
 * Represents a subcommand in a CLI application.
 */
export abstract class Subcommand {
  public abstract readonly name: string;
  public abstract readonly description: string;

  /** Defines the subcommand's arguments using yargs. */
  public abstract readonly arguments: CommandBuilder;

  /**
   * Implements the subcommand's functionality.
   * @param user - The WalletManager instance for user management.
   * @param argv - The parsed command-line arguments.
   */
  public abstract method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void>;
}

/**
 * Represents a main command in a CLI application.
 */
export abstract class Command {
  protected readonly user: WalletManager;
  protected readonly globals = globals;
  public abstract readonly name: string;
  public abstract readonly description: string;

  /** An array of Subcommand instances associated with this command. */
  protected abstract readonly subcommands: Subcommand[];

  constructor(user: WalletManager) {
    this.user = user;
  }

  /**
   * Builds the command structure using yargs, including all subcommands.
   * @returns A yargs CommandModule object representing the command structure.
   */
  public build(): CommandModule<Record<string, unknown>, any> {
    return {
      command: this.name,
      describe: this.description,
      builder: (yargs) => {
        for (const subcommand of this.subcommands) {
          yargs.command({
            command: subcommand.name,
            describe: subcommand.description,
            builder: subcommand.arguments,
            handler: async (argv) => {
              await subcommand.method(this.user, argv);
            },
          });
        }

        return yargs;
      },
      handler: (argv) => {
        // Show help if no subcommand is provided
        if (argv._.length === 1) {
          yargs().showHelp();
        }
      },
    };
  }
}
