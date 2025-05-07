/**
 * Mock data for testing HTTP requests and responses.
 * This file contains mock objects that simulate HTTP requests and responses
 * for testing route handlers in a Node.js HTTP server.
 * 
 * @module mockData
 * @version 1.0.0
 */

/**
 * A mock HTTP request object for testing route handlers
 * @type {Object}
 */
const mockRequest = {
  url: '/hello',
  method: 'GET'
};

/**
 * A mock HTTP response object for testing route handlers
 * @type {Object}
 */
const mockResponse = {
  /**
   * A mock writeHead function to set headers
   * @param {number} statusCode - The HTTP status code
   * @param {Object} headers - The response headers
   * @returns {Object} The response object for chaining
   */
  writeHead: jest.fn(function(statusCode, headers) {
    this.statusCode = statusCode;
    this.headers = headers;
    return this;
  }),
  
  /**
   * A mock end function to send the response
   * @param {string} data - The response data
   * @returns {Object} The response object for chaining
   */
  end: jest.fn(function(data) {
    this.data = data;
    return this;
  }),
  
  // Properties to store values for easier assertions
  statusCode: null,
  headers: null,
  data: null
};

module.exports = {
  mockRequest,
  mockResponse
};