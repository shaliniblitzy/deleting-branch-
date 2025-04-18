/**
 * Node.js Hello World application test runner script.
 * Provides functionality to run different types of tests with various options.
 * 
 * @version 1.0.0
 */

const jest = require('jest'); // v29.6.1
const path = require('path'); // core module

/**
 * Displays help information for the test script
 */
function showHelp() {
  console.log(`
Usage: node test.js [options]

Options:
  --unit         Run only unit tests
  --integration  Run only integration tests
  --e2e          Run only end-to-end tests
  --coverage     Generate code coverage report
  --help         Show this help message

Examples:
  node test.js                  # Run all tests
  node test.js --unit           # Run only unit tests
  node test.js --coverage       # Run all tests with coverage
  node test.js --e2e --coverage # Run e2e tests with coverage
  `);
  process.exit(0);
}

/**
 * Parses command line arguments to determine which tests to run and with what options.
 * @param {string[]} args - Array of command line arguments
 * @returns {object} - An object containing parsed options for test execution
 */
function parseArguments(args) {
  // Initialize default options
  const options = {
    testType: 'all', // Default to running all tests
    coverage: false, // Default to no coverage
    help: false      // Default to not showing help
  };

  // Iterate through arguments
  for (const arg of args) {
    if (arg === '--unit') {
      options.testType = 'unit';
    } else if (arg === '--integration') {
      options.testType = 'integration';
    } else if (arg === '--e2e') {
      options.testType = 'e2e';
    } else if (arg === '--coverage') {
      options.coverage = true;
    } else if (arg === '--help') {
      options.help = true;
    } else if (arg.startsWith('--')) {
      console.warn(`⚠️  Warning: Unknown option '${arg}' will be ignored.`);
    }
  }

  return options;
}

/**
 * Generates Jest configuration based on the parsed options.
 * @param {object} options - Options object from parseArguments
 * @returns {object} - Jest configuration object with appropriate settings
 */
function getTestConfig(options) {
  // Base configuration
  const config = {
    rootDir: path.resolve(__dirname, '..'), // Set root directory to the project root
    verbose: true,
    testEnvironment: 'node',
    testTimeout: 10000, // 10 seconds timeout for tests
    bail: 0, // Don't bail on first test failure, run all tests
    silent: false, // Show console output during tests
    colors: true // Use colors in output
  };

  // Configure test matching based on test type
  switch (options.testType) {
    case 'unit':
      config.testMatch = ['**/__tests__/unit/**/*.test.js'];
      console.log('🔍 Running unit tests');
      break;
    case 'integration':
      config.testMatch = ['**/__tests__/integration/**/*.test.js'];
      console.log('🔍 Running integration tests');
      break;
    case 'e2e':
      config.testMatch = ['**/__tests__/e2e/**/*.test.js'];
      console.log('🔍 Running end-to-end tests');
      break;
    case 'all':
    default:
      config.testMatch = ['**/__tests__/**/*.test.js'];
      console.log('🔍 Running all tests');
      break;
  }

  // Add coverage configuration if requested
  if (options.coverage) {
    console.log('📊 Collecting code coverage');
    config.collectCoverage = true;
    config.coverageDirectory = path.resolve(__dirname, '../coverage');
    config.coverageReporters = ['text', 'lcov', 'html'];
    config.collectCoverageFrom = [
      'src/**/*.js',
      '!**/node_modules/**',
      '!**/vendor/**',
      '!**/coverage/**',
      '!**/dist/**'
    ];
    
    // Add thresholds based on the Quality Metrics requirements
    config.coverageThreshold = {
      global: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90
      },
      // Specific thresholds for critical components based on technical specification
      './src/routeHandler.js': {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100
      },
      './src/errorHandler.js': {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100
      },
      './src/config.js': {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100
      }
    };
  }

  return config;
}

/**
 * Runs Jest tests with the specified configuration.
 * @param {object} config - Jest configuration object
 * @returns {Promise<void>} - A promise that resolves when tests complete or rejects if tests fail
 */
async function runTests(config) {
  console.log('\n🚀 Starting test execution...\n');
  
  try {
    // Create Jest instance
    const jestInstance = jest.runCLI(config, [config.rootDir]);
    
    // Handle test results
    const results = await jestInstance;
    
    if (results.results.success) {
      console.log('\n✅ All tests passed successfully!');
      
      // Log test summary
      const { numTotalTests, numPassedTests, numFailedTests, numPendingTests } = results.results;
      console.log(`\n📋 Test Summary:`);
      console.log(`   Total: ${numTotalTests}`);
      console.log(`   Passed: ${numPassedTests}`);
      console.log(`   Failed: ${numFailedTests}`);
      console.log(`   Pending: ${numPendingTests}`);
      
      // Log coverage information if available
      if (config.collectCoverage) {
        console.log('\n📊 Coverage information has been generated.');
        console.log(`   Coverage report is available at: ${config.coverageDirectory}`);
      }
      
      process.exit(0);
    } else {
      console.error('\n❌ Tests failed!');
      
      // Log test summary
      const { numTotalTests, numPassedTests, numFailedTests, numPendingTests } = results.results;
      console.log(`\n📋 Test Summary:`);
      console.log(`   Total: ${numTotalTests}`);
      console.log(`   Passed: ${numPassedTests}`);
      console.log(`   Failed: ${numFailedTests}`);
      console.log(`   Pending: ${numPendingTests}`);
      
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Error running tests:');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Main function that orchestrates the test execution process.
 * @returns {Promise<void>} - A promise that resolves when the entire test process completes
 */
async function main() {
  console.log('\n🧪 Node.js Hello World Test Runner 🧪');
  console.log('==========================================\n');
  
  try {
    // Get command line arguments (skip the first two: node and script path)
    const args = process.argv.slice(2);
    
    // Parse arguments
    const options = parseArguments(args);
    
    // Show help if requested
    if (options.help) {
      showHelp();
      return;
    }
    
    // Print a summary of what we're about to do
    console.log(`🔧 Configuration:`);
    console.log(`   Test Type: ${options.testType}`);
    console.log(`   Coverage: ${options.coverage ? 'Enabled' : 'Disabled'}`);
    console.log('');
    
    // Generate test configuration
    const config = getTestConfig(options);
    
    // Run tests
    await runTests(config);
  } catch (error) {
    console.error('\n💥 Error in test execution:');
    console.error(error);
    process.exit(1);
  }
}

// Run the main function if this file is being executed directly
if (require.main === module) {
  main();
}

// Export functions for potential use in other modules
module.exports = {
  parseArguments,
  getTestConfig,
  runTests,
  main
};