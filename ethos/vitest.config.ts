import { defineConfig } from 'vitest/config';

const EXCLUSIONS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/packages/contracts/**',
  '**/web/.next/**',
];

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'json', 'html', 'text-summary'], // Adjust coverage reports as needed
      reportsDirectory: './test-reports/coverage',
      exclude: EXCLUSIONS,
    },
    globals: true,
    environment: 'node',
    exclude: EXCLUSIONS,
  },
});
