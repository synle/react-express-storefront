module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  // Set env vars before any module loads
  setupFiles: ['<rootDir>/tests/env-setup.js'],
  // Increase timeout for integration tests (DB setup)
  testTimeout: 15000
};
