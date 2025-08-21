module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages', '<rootDir>/tests'],
  testMatch: [
    '**/src/**/__tests__/**/*.ts',
    '**/src/**/*.test.ts',
    '**/src/**/*.spec.ts',
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],
  collectCoverageFrom: [
    '**/src/**/*.ts',
    '!**/src/**/*.d.ts',
    '!**/src/**/__tests__/**',
    '!**/dist/**',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapping: {
    '^@writerr/shared$': '<rootDir>/packages/shared/src',
    '^@writerr/shared/(.*)$': '<rootDir>/packages/shared/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 10000,
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        target: 'ES2022',
        module: 'CommonJS'
      }
    }]
  }
};