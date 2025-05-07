/**
 * End-to-end tests for the /health endpoint
 * 
 * These tests verify the complete request-response cycle for the
 * health check functionality, ensuring the endpoint is accessible
 * and returns the expected data format.
 */

// Import HTTP client for making requests to the server
const axios = require('axios'); // version: ^1.6.7

// Import server functions from the server module
const { createServer, start, stop } = require('../../src/server');

// Server instance variable
let server = null;

// Base URL for API requests
const baseUrl = 'http://localhost:3000';

/**
 * Sets up the server before running the tests
 * @returns {Promise<void>} A promise that resolves when the server is started
 */
async function setupServer() {
  // Create a new server instance
  server = createServer();
  
  // Start the server and return the promise
  return start(server);
}

/**
 * Tears down the server after running the tests
 * @returns {Promise<void>} A promise that resolves when the server is stopped
 */
async function teardownServer() {
  // Stop the server and return the promise
  return stop(server);
}

// Health Endpoint E2E Tests
describe('Health Endpoint E2E Tests', () => {
  // Set up the server before all tests
  beforeAll(setupServer);
  
  // Tear down the server after all tests
  afterAll(teardownServer);
  
  // Test that the health endpoint returns a 200 status code
  test('GET /health should return 200 status code', async () => {
    const response = await axios.get(`${baseUrl}/health`);
    expect(response.status).toBe(200);
  });
  
  // Test that the health endpoint returns a JSON response
  test('GET /health should return JSON response', async () => {
    const response = await axios.get(`${baseUrl}/health`);
    expect(response.headers['content-type']).toContain('application/json');
  });
  
  // Test that the health endpoint includes status and uptime in the response
  test('GET /health should include status and uptime in the response', async () => {
    const response = await axios.get(`${baseUrl}/health`);
    expect(response.data).toHaveProperty('status');
    expect(response.data).toHaveProperty('uptime');
  });
  
  // Test that the health endpoint has status set to 'UP'
  test("GET /health should have status set to 'UP'", async () => {
    const response = await axios.get(`${baseUrl}/health`);
    expect(response.data.status).toBe('UP');
  });
  
  // Test that the health endpoint includes a numeric uptime value
  test('GET /health should include a numeric uptime value', async () => {
    const response = await axios.get(`${baseUrl}/health`);
    expect(typeof response.data.uptime.seconds).toBe('number');
    expect(response.data.uptime.seconds).toBeGreaterThan(0);
  });
});