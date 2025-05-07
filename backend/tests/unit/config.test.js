/**
 * Unit tests for the configuration module.
 * Tests the behavior of the configuration functions that handle loading settings from environment variables
 * and providing default values when configuration is not provided.
 */

const { getPort } = require('../../src/config');

describe('Config Module', () => {
  // Store the original process.env
  let originalEnv;

  // Setup before each test - reset environment variables
  beforeEach(() => {
    // Store the original process.env object
    originalEnv = { ...process.env };
    // Reset process.env to a clean state
    process.env = {};
  });

  // Cleanup after each test - restore environment variables
  afterEach(() => {
    // Restore the original process.env object
    process.env = originalEnv;
  });

  describe('getPort', () => {
    it('should return default port when PORT environment variable is not set', () => {
      // PORT is not set in the clean process.env
      const port = getPort();
      expect(port).toBe(3000);
    });

    it('should return PORT environment variable value when it is set', () => {
      // Set PORT environment variable
      process.env.PORT = '8080';
      const port = getPort();
      expect(port).toBe(8080);
    });

    it('should convert PORT environment variable to a number', () => {
      // Set PORT environment variable as a string
      process.env.PORT = '4000';
      const port = getPort();
      // Verify it's converted to a number
      expect(port).toBe(4000);
      expect(typeof port).toBe('number');
    });

    it('should return default port for invalid PORT values', () => {
      // Spy on console.warn to prevent output during tests and to verify it's called
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Set an invalid PORT value
      process.env.PORT = 'not-a-number';
      const port = getPort();
      
      // Verify default port is used and warning is issued
      expect(port).toBe(3000);
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      // Restore console.warn to its original implementation
      consoleWarnSpy.mockRestore();
    });

    it('should return default port for out-of-range PORT values', () => {
      // Spy on console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Set a PORT value outside the valid range
      process.env.PORT = '70000';
      const port = getPort();
      
      // Verify default port is used and warning is issued
      expect(port).toBe(3000);
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      // Restore console.warn
      consoleWarnSpy.mockRestore();
    });
  });
});