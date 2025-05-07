/**
 * Integration tests for error handling in the API.
 * 
 * This file implements tests for requirement F-004 (Error Handling),
 * specifically focusing on how the API handles invalid routes and methods.
 */

const request = require('supertest'); // version 6.x
const { createServer } = require('../src/server');

describe('API Error Handling', () => {
  let server;
  
  // Create a new server instance before each test
  beforeEach(() => {
    server = createServer();
  });
  
  // Close the server after each test to release resources
  afterEach((done) => {
    if (server && server.listening) {
      server.close(done);
    } else {
      done();
    }
  });
  
  // Test for invalid routes (F-004-RQ-001)
  test('GET /invalid should return 404', async () => {
    // Make a GET request to /invalid using supertest
    const response = await request(server).get('/invalid');
    
    // Assert that the response status code is 404
    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toBe('Not Found');
  });
  
  // Test for invalid methods (F-004-RQ-001)
  test('POST /hello should return 405', async () => {
    // Make a POST request to /hello using supertest
    const response = await request(server).post('/hello');
    
    // Assert that the response status code is 405
    expect(response.status).toBe(405);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.headers['allow']).toBe('GET');
    expect(response.text).toBe('Method Not Allowed');
  });
  
  // Test security headers are included in error responses
  test('Error responses include security headers', async () => {
    const response = await request(server).get('/invalid');
    
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['content-security-policy']).toBe("default-src 'none'");
    expect(response.headers['cache-control']).toBe('no-store');
  });
});