import pkg from '../package.json' with { type: 'json' };
import { generateManifest, type Mode, modes } from './manifest.utils';

function isValidMode(mode: string): mode is Mode {
  return modes.some((m) => m === mode);
}

try {
  const mode = process.argv[2];

  if (!isValidMode(mode)) {
    throw new Error(`Invalid mode: ${mode}.\nPass one of those: ${modes.join(', ')}`);
  }

  generateManifest(mode, pkg.version);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
