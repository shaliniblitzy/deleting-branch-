const axios = require('axios'); // axios@^1.6.0
const { describe, expect, it } = require('@jest/globals'); // @jest/globals@^29.7.0

// Configuration for the tests
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

/**
 * End-to-end tests for the Hello World server application.
 * 
 * These tests verify that the server correctly responds to HTTP requests
 * to the /hello endpoint as well as handling of invalid routes.
 * 
 * Note: The server must be running before executing these tests.
 * Start the server with: `npm start` in a separate terminal.
 */
describe('Hello Endpoint E2E Tests', () => {
  // Test that GET /hello returns "Hello world" with 200 status
  it("GET /hello should return 'Hello world'", async () => {
    // Send a GET request to the /hello endpoint
    const response = await axios.get(`${SERVER_URL}/hello`);
    
    // Assert that the response status is 200
    expect(response.status).toBe(200);
    
    // Assert that the response body is "Hello world"
    expect(response.data).toBe('Hello world');
    
    // Check that the Content-Type header is set correctly
    expect(response.headers['content-type']).toContain('text/plain');
  });

  // Test that GET / returns 404 status
  it('GET / should return 404', async () => {
    // Use a try/catch because we expect this request to fail
    try {
      // Send a GET request to the root path
      await axios.get(SERVER_URL);
      
      // If we get here, the request didn't fail as expected
      throw new Error('Expected request to fail with 404 status code');
    } catch (error) {
      // Make sure we have a response (not a network error)
      expect(error.response).toBeDefined();
      
      // Assert that the error is a 404 response
      expect(error.response.status).toBe(404);
    }
  });
});