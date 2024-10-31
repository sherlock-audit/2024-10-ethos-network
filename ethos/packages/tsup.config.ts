import { defineConfig, type Options } from 'tsup';

export const config: Options = {
  entry: ['src/*'], // Entry point
  format: ['cjs', 'esm'], // CJS and ESM builds
  dts: true,
  minify: false, // Optional: Easier to debug without minification
  clean: true, // Clean dist folder before building
  outDir: 'dist', // Output directory
  target: 'esnext', // Adjust if targeting older Node versions
  silent: true,
  onSuccess: 'tsc --emitDeclarationOnly',
};

export default defineConfig(config);
