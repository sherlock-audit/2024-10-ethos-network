import { type ArgumentsCamelCase } from 'yargs';
import { error } from './output.js';

/**
 * Validator class for handling command-line arguments.
 * This class provides methods to validate and parse different types of input flags.
 */
export class Validator {
  private readonly argv: ArgumentsCamelCase<unknown>;

  /**
   * Creates a new Validator instance.
   * @param argv - The command-line arguments object from yargs.
   */
  constructor(argv: ArgumentsCamelCase<unknown>) {
    this.argv = argv;
  }

  /**
   * Validates and returns a string flag.
   * @param key - The name of the flag.
   * @returns The validated string value.
   * @throws Exits the process if the flag is not a string.
   */
  String(key: string): string {
    const flag = this.argv[key];

    if (typeof flag !== 'string') {
      error(`--${key} must be specified (as a string)`);
      process.exit(0);
    }

    return flag;
  }

  /**
   * Validates and returns a float flag. Allows decimal values.
   * @param key - The name of the flag.
   * @returns The validated float value.
   * @throws Exits the process if the flag is not a valid number.
   */
  Float(key: string): number {
    const flag = this.argv[key];
    const parsedValue = parseFloat(flag as string);

    if (isNaN(parsedValue)) {
      error(`--${key} must be a valid number`);
      process.exit(0);
    }

    return parsedValue;
  }

  /**
   * Validates and returns an integer flag. Does not allow decimal values.
   * @param key - The name of the flag.
   * @returns The validated integer value.
   * @throws Exits the process if the flag is not a valid integer.
   */
  Integer(key: string): number {
    const flag = this.argv[key];
    const parsedValue = parseInt(flag as string, 10);

    if (isNaN(parsedValue) || !Number.isInteger(parsedValue)) {
      error(`--${key} must be a valid integer`);
      process.exit(0);
    }

    return parsedValue;
  }

  /**
   * Validates and returns a rating flag.
   * @param key - The name of the flag.
   * @returns The validated rating value ('positive', 'neutral', or 'negative').
   * @throws Exits the process if the flag is not a valid rating.
   */
  Rating(key: string): 'positive' | 'neutral' | 'negative' {
    const flag = this.argv[key] as string;

    if (flag !== 'positive' && flag !== 'neutral' && flag !== 'negative') {
      error(`${key} must be positive, neutral, or negative`);
      process.exit(0);
    }

    return flag;
  }

  /**
   * Validates and returns a boolean flag.
   * @param key - The name of the flag.
   * @returns The boolean value of the flag.
   */
  Boolean(key: string): boolean {
    const flag = this.argv[key];

    return flag === true;
  }

  /**
   * Validates and returns an array flag.
   * @param key - The name of the flag.
   * @returns The validated array value.
   * @throws Exits the process if the flag is not a valid array.
   */
  Array(key: string): string[] {
    const flag = this.argv[key];

    if (!Array.isArray(flag)) {
      error(`--${key} must be specified as an array`);
      process.exit(0);
    }

    return flag.filter((item): item is string => typeof item === 'string');
  }

  /**
   * Validates and returns a BigInt flag.
   * @param key - The name of the flag.
   * @returns The validated BigInt value.
   * @throws Exits the process if the flag is not a valid BigInt.
   */
  BigInt(key: string): bigint {
    const flag = this.argv[key];

    try {
      const parsedValue = BigInt(flag as string);

      return parsedValue;
    } catch (e) {
      error(`--${key} must be a valid BigInt`);
      process.exit(0);
    }
  }
}
