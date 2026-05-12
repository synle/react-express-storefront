module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  // Set env vars before any module loads
  setupFiles: ['<rootDir>/tests/env-setup.js'],
  // Increase timeout for integration tests (DB setup)
  testTimeout: 15000,
  collectCoverage: true,
  collectCoverageFrom: [
    'app.js',
    'server.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
    '!**/*.test.*',
    '!**/tests/**',
    '!**/db/migrations/**',
    '!**/db/seeds/**'
  ],
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageDirectory: 'coverage',
  // Floor-to-baseline thresholds. Measured on 2026-05-12:
  // statements 44.75, branches 37.83, functions 58.82, lines 44.53.
  // Raise as coverage improves.
  coverageThreshold: {
    global: {
      statements: 44,
      branches: 37,
      functions: 58,
      lines: 44
    }
  }
};
