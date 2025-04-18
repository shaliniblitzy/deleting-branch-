/**
 * Unit tests for the server.js module
 * 
 * These tests verify the functionality of the server module, including
 * server creation, startup, and error handling.
 */

// Import the createServer function from the server module
// Version: backend/src/server.js
const { createServer } = require('../src/server');

// Jest testing framework - version: 29.x
// describe: Groups related tests
// it: Defines individual test cases
// expect: Makes assertions about expected outcomes
// jest: Provides mocking functionalities

describe('Server', () => {
  it('should create a server instance', () => {
    // Call createServer()
    const server = createServer();
    
    // Assert that the returned value is an object
    expect(server).toBeDefined();
    expect(typeof server).toBe('object');
  });
  
  it('should start the server on the configured port', async () => {
    // Mock the listen function of the server object
    const mockListen = jest.fn((port, callback) => {
      if (callback) callback();
    });
    
    const mockServer = {
      listen: mockListen,
      on: jest.fn()
    };
    
    // Import the start function
    const { start } = require('../src/server');
    
    // Suppress console output during test
    const originalConsoleLog = console.log;
    console.log = jest.fn();
    
    try {
      // Call the start function
      await start(mockServer);
      
      // Assert that the listen function is called with the configured port
      expect(mockListen).toHaveBeenCalled();
      expect(mockListen.mock.calls[0][0]).toBeDefined(); // Port number should be defined
    } finally {
      // Restore console.log
      console.log = originalConsoleLog;
    }
  });
  
  it('should handle errors during server startup', async () => {
    // Mock the listen function to throw an error
    const error = new Error('Test startup error');
    const mockListen = jest.fn(() => {
      throw error;
    });
    
    const mockServer = {
      listen: mockListen,
      on: jest.fn()
    };
    
    // Import the start function
    const { start } = require('../src/server');
    
    // Suppress console output during test
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    try {
      // Call the start function
      await expect(start(mockServer)).rejects.toThrow();
      
      // Assert that the error is caught and handled appropriately
      expect(console.error).toHaveBeenCalled();
    } finally {
      // Restore console.error
      console.error = originalConsoleError;
    }
  });
});