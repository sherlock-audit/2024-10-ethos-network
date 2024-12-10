export const globals = {
  verbose: false,
  wait: false,
};

export function updateGlobals(argv: any): void {
  globals.verbose = argv.verbose ?? false;
  globals.wait = argv.wait ?? false;

  if (globals.verbose) {
    // eslint-disable-next-line no-console
    console.log('Options:', globals);
  }
}

export const verboseOption = {
  alias: 'v',
  type: 'boolean' as const,
  description: 'Run with verbose logging',
  global: true,
};

export const waitOption = {
  alias: 'w',
  type: 'boolean' as const,
  description: 'Wait for the transaction to complete before exiting',
  global: true,
};
