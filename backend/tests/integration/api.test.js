/**
 * Integration tests for the API endpoints.
 * 
 * This file contains tests that verify the behavior of the HTTP endpoints,
 * specifically focusing on the '/hello' endpoint which returns 'Hello world'.
 * These tests ensure that the API meets the requirements specified in F-002.
 */

// Import supertest for making HTTP requests to the API - version: 6.x
const request = require('supertest');

// Import the createServer function from server.js
const { createServer } = require('../src/server');

describe('API Integration', () => {
  // Server instance used for testing
  let server;
  
  // Before each test, create a new server instance
  beforeEach(() => {
    server = createServer();
  });
  
  // After each test, close the server to free up resources
  afterEach((done) => {
    if (server && server.listening) {
      server.close(done);
    } else {
      done();
    }
  });
  
  /**
   * Test that the '/hello' endpoint returns 'Hello world' with a 200 status code
   * and the correct content type.
   */
  it('GET /hello should return "Hello world"', async () => {
    // Make a GET request to the /hello endpoint
    const response = await request(server).get('/hello');
    
    // Assert that the response has a 200 status code
    expect(response.status).toBe(200);
    
    // Assert that the response body is 'Hello world'
    expect(response.text).toBe('Hello world');
    
    // Assert that the response has the correct content type
    expect(response.headers['content-type']).toContain('text/plain');
  });
  
  /**
   * Test that a request to an unknown endpoint returns a 404 status code.
   */
  it('GET /unknown should return 404', async () => {
    // Make a GET request to an unknown endpoint
    const response = await request(server).get('/unknown');
    
    // Assert that the response has a 404 status code
    expect(response.status).toBe(404);
  });
});