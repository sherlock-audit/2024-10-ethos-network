/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  coverageReporters: ['clover', 'json', 'lcov', 'text', 'text-summary'],
  coverageDirectory: './test-reports/coverage',
  collectCoverageFrom: ['**/src/**/*.ts', '**/src/**/*.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  prettierPath: require.resolve('prettier-2'),
  reporters: ['default', ['jest-junit', { outputDirectory: './test-reports' }]],
  setupFiles: ['./.jest/setEnv.js'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/packages/contracts/'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        isolatedModules: true,
      },
    ],
  },
};
