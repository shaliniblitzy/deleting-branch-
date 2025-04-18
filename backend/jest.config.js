/**
 * Jest Configuration File
 * 
 * This file configures Jest for testing the Node.js Hello World application.
 * It defines the test environment, test patterns, coverage reporting settings,
 * and threshold requirements as specified in the testing strategy.
 * 
 * @version 1.0.0
 */

module.exports = {
  // Specifies the test environment that will be used for testing
  // Using Node.js environment since this is a server-side application
  testEnvironment: 'node',
  
  // Specifies the root directories where Jest should look for tests
  roots: ['<rootDir>/tests'],
  
  // Patterns to match test files
  // This will match files in __tests__ directories or files ending with .spec.js or .test.js
  testMatch: ['**/__tests__/**/*.js?(x)', '**/?(*.)+(spec|test).js?(x)'],
  
  // Specifies which files should be included in coverage analysis
  // Includes all JS files in src directory, but excludes test files and node_modules
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**'
  ],
  
  // Directory where Jest should output coverage files
  coverageDirectory: 'coverage',
  
  // Minimum threshold enforcement for coverage results
  // Global threshold of 90% for all metrics
  // Critical components require 100% coverage as specified in testing strategy
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/routeHandler.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    'src/errorHandler.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  
  // Automatically clear mock calls and instances between every test
  // Ensures test isolation by clearing mocks between tests
  clearMocks: true,
  
  // Indicates whether each individual test should be reported during the run
  // Provides detailed output during test execution
  verbose: true,
  
  // The default timeout of a test in milliseconds
  // Sets a reasonable timeout for tests, especially for E2E tests that might take longer
  testTimeout: 5000
};