import { BlockchainManager } from '@ethos/blockchain-manager';
import chalk from 'chalk';
import { type TransactionResponse } from 'ethers';
import { globals } from '../globals';
import { ETHOS_ENV } from './config';

const blockchainManager = new BlockchainManager(ETHOS_ENV); // only used for parsing errors

/**
 * Formats a label-value pair into a fixed-width string.
 *
 * @param label - The label to be displayed.
 * @param value - The value associated with the label.
 * @returns A formatted string with fixed-width label and value.
 *
 * @example
 * ```typescript
 * out(f('Name', 'John Doe'));
 * // Output: "  - Name            John Doe                                "
 * ```
 */
export function f(label: string, value: string): string {
  const labelWidth = 16;
  const valueWidth = 40;
  const totalWidth = labelWidth + valueWidth;

  return `  - ${label.padEnd(labelWidth)}${value.padEnd(valueWidth)}`.slice(0, totalWidth);
}

/**
 * Helper function for logging messages to the console.
 * @param message - The message to be logged.
 * @param color - The color to apply to the message (default: green).
 * @param exit - Whether to exit the process after logging (default: false).
 */
export function out(
  message: string,
  color: chalk.Chalk = chalk.green,
  exit: boolean = false,
): void {
  // eslint-disable-next-line no-console
  console.log(color(message));

  if (exit) process.exit(0);
}

/**
 * Helper function for logging error messages to the console.
 * @param message - The error message to be logged.
 * @param exit - Whether to exit the process after logging (default: true).
 */
export function error(message: string, exit: boolean = true): void {
  console.error(chalk.red(message));

  if (exit) process.exit(0);
}

/**
 * Handles transaction output, either logging an error for failed transactions
 * or displaying a link to view the transaction on Basescan.
 * @param tx - The transaction object, a promise resolving to a transaction object, or null.
 */
export async function txn(tx: Promise<TransactionResponse>): Promise<void> {
  let response: TransactionResponse;
  try {
    response = await blockchainManager.wrapChainErr(async () => await tx);
  } catch (e) {
    if (globals.verbose) {
      console.error(e);
    }
    if (typeof e === 'object' && e !== null && 'action' in e) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      error(`❌ Transaction failed: ${e.action}`);
    } else if (e instanceof Error) {
      error(`❌ Transaction failed: ${e.name}`);
    } else {
      error(`❌ Transaction failed: ${String(e)}`);
    }

    return;
  }

  out(`🎫 View on Basescan: https://sepolia.basescan.org/tx/${response.hash}`);

  if (globals.wait && response.wait) {
    out('💤 Waiting for transaction confirmation...');
    await response.wait();
    out('✅ Transaction confirmed');
  }
}
