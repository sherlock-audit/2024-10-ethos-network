import { defineConfig } from 'tsup';
import { config } from '../tsup.config';

export default defineConfig({
  ...config,
  dts: false,
  entry: ['src/*'], // Entry point
  onSuccess: 'tsc --emitDeclarationOnly --declaration --project tsconfig.build.json',
});
