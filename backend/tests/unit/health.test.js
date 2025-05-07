const { healthCheckHandler } = require('../../src/health');
const { mockRequest, mockResponse } = require('../fixtures/mockData');

describe('Health Check Handler', () => {
  let req;
  let res;
  
  beforeEach(() => {
    // Create fresh copies of mocks before each test
    req = { ...mockRequest };
    res = { ...mockResponse };
    
    // Clear any previous mock calls
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Restore any mocked functions to their original implementation
    jest.restoreAllMocks();
  });

  it('should return a 200 status code', () => {
    // Arrange: Create mock request and response objects
    // (done in beforeEach)
    
    // Act: Call healthCheckHandler(req, res)
    healthCheckHandler(req, res);
    
    // Assert: Verify that res.writeHead is called with 200 and correct headers
    expect(res.statusCode).toBe(200);
    expect(res.headers).toHaveProperty('Content-Type', 'application/json');
  });

  it('should return a JSON response', () => {
    // Arrange: Create mock request and response objects
    // (done in beforeEach)
    
    // Act: Call healthCheckHandler(req, res)
    healthCheckHandler(req, res);
    
    // Assert: Verify that res.end is called with a valid JSON string
    expect(res.end).toHaveBeenCalled();
    expect(() => JSON.parse(res.data)).not.toThrow();
  });

  it('should include status and uptime in the response', () => {
    // Arrange: Create mock request and response objects
    // (done in beforeEach)
    
    // Act: Call healthCheckHandler(req, res)
    healthCheckHandler(req, res);
    
    // Assert: Parse the JSON response and verify it contains status and uptime properties
    const response = JSON.parse(res.data);
    expect(response).toHaveProperty('status');
    expect(response).toHaveProperty('uptime');
    expect(response.uptime).toHaveProperty('seconds');
    expect(response.uptime).toHaveProperty('formatted');
  });

  it("should set the status to 'UP'", () => {
    // Arrange: Create mock request and response objects
    // (done in beforeEach)
    
    // Act: Call healthCheckHandler(req, res)
    healthCheckHandler(req, res);
    
    // Assert: Parse the JSON response and verify the status property is 'UP'
    const response = JSON.parse(res.data);
    expect(response.status).toBe('UP');
  });

  it('should include a numeric uptime value', () => {
    // Arrange: Create mock request and response objects
    // (done in beforeEach)
    // Mock the process.uptime function to return a known value
    const mockUptimeValue = 3661; // 1h 1m 1s
    jest.spyOn(process, 'uptime').mockReturnValue(mockUptimeValue);
    
    // Act: Call healthCheckHandler(req, res)
    healthCheckHandler(req, res);
    
    // Assert: Parse the JSON response and verify the uptime property is a number matching the mocked value
    const response = JSON.parse(res.data);
    expect(typeof response.uptime.seconds).toBe('number');
    expect(response.uptime.seconds).toBe(mockUptimeValue);
    expect(response.uptime.formatted).toContain('1h');
  });
});