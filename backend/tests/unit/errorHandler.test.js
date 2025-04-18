/**
 * Unit tests for the error handler component.
 * Tests the behavior of the error handling functions, ensuring they correctly
 * process errors and generate appropriate responses with the correct status codes and headers.
 */

const {
  handleNotFound,
  handleMethodNotAllowed,
  handleServerError,
  logServerStartupError,
  setSecurityHeaders
} = require('../../src/errorHandler');

const { mockRequest, mockResponse } = require('../fixtures/mockData');

describe('Error Handler', () => {
  
  let res;
  let consoleErrorSpy;
  
  beforeEach(() => {
    // Create a fresh mock response for each test based on the fixture
    res = {
      ...mockResponse,
      setHeader: jest.fn()
    };
    
    // Reset the mockResponse functions
    res.writeHead.mockClear();
    res.end.mockClear();
    
    // Spy on console.error to verify error logging
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // Restore console.error to its original implementation
    consoleErrorSpy.mockRestore();
  });
  
  describe('handleNotFound', () => {
    it('should return 404 status code with correct headers', () => {
      // Act
      handleNotFound(res);
      
      // Assert
      expect(res.writeHead).toHaveBeenCalledWith(404, {
        'Content-Type': 'text/plain'
      });
      expect(res.end).toHaveBeenCalledWith('Not Found');
    });
    
    it('should set security headers', () => {
      // Arrange
      const setSecurityHeadersSpy = jest.spyOn(setSecurityHeaders);
      
      // Act
      handleNotFound(res);
      
      // Assert
      expect(setSecurityHeadersSpy).toHaveBeenCalledWith(res);
    });
  });
  
  describe('handleMethodNotAllowed', () => {
    it('should return 405 status code with correct headers', () => {
      // Act
      handleMethodNotAllowed(res, ['GET']);
      
      // Assert
      expect(res.writeHead).toHaveBeenCalledWith(405, {
        'Content-Type': 'text/plain',
        'Allow': 'GET'
      });
      expect(res.end).toHaveBeenCalledWith('Method Not Allowed');
    });
    
    it('should set security headers', () => {
      // Arrange
      const setSecurityHeadersSpy = jest.spyOn(setSecurityHeaders);
      
      // Act
      handleMethodNotAllowed(res, ['GET']);
      
      // Assert
      expect(setSecurityHeadersSpy).toHaveBeenCalledWith(res);
    });
    
    it('should handle multiple allowed methods', () => {
      // Act
      handleMethodNotAllowed(res, ['GET', 'POST', 'PUT']);
      
      // Assert
      expect(res.writeHead).toHaveBeenCalledWith(405, expect.objectContaining({
        'Allow': 'GET, POST, PUT'
      }));
    });
  });
  
  describe('handleServerError', () => {
    it('should return 500 status code with correct headers', () => {
      // Arrange
      const error = new Error('Test error');
      
      // Act
      handleServerError(res, error);
      
      // Assert
      expect(res.writeHead).toHaveBeenCalledWith(500, {
        'Content-Type': 'text/plain'
      });
      expect(res.end).toHaveBeenCalledWith('Internal Server Error');
    });
    
    it('should log the error to console', () => {
      // Arrange
      const error = new Error('Test error');
      
      // Act
      handleServerError(res, error);
      
      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // Once for the message, once for the stack
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Server error: Test error'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(error.stack);
    });
    
    it('should set security headers', () => {
      // Arrange
      const error = new Error('Test error');
      const setSecurityHeadersSpy = jest.spyOn(setSecurityHeaders);
      
      // Act
      handleServerError(res, error);
      
      // Assert
      expect(setSecurityHeadersSpy).toHaveBeenCalledWith(res);
    });
  });
  
  describe('logServerStartupError', () => {
    it('should log the error to console', () => {
      // Arrange
      const error = new Error('Startup error');
      
      // Act
      logServerStartupError(error);
      
      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // Once for the message, once for the stack
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Server startup failed: Startup error'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(error.stack);
    });
    
    it('should include timestamp in the log message', () => {
      // Arrange
      const error = new Error('Startup error');
      
      // Act
      logServerStartupError(error);
      
      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\]/));
    });
  });
  
  describe('setSecurityHeaders', () => {
    it('should set X-Content-Type-Options header', () => {
      // Act
      setSecurityHeaders(res);
      
      // Assert
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });
    
    it('should set X-Frame-Options header', () => {
      // Act
      setSecurityHeaders(res);
      
      // Assert
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });
    
    it('should set Content-Security-Policy header', () => {
      // Act
      setSecurityHeaders(res);
      
      // Assert
      expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', "default-src 'none'");
    });
    
    it('should set Cache-Control header', () => {
      // Act
      setSecurityHeaders(res);
      
      // Assert
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    });
  });
});