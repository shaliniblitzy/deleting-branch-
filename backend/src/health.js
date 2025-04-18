/**
 * health.js
 * 
 * Implements a health check endpoint for the server which provides information
 * about the server's operational status and uptime.
 * 
 * This implements part of F-004 (Error Handling) by providing a way to verify
 * server operational status.
 */

/**
 * Formats seconds into a human-readable uptime string.
 * 
 * @private
 * @param {number} seconds - The uptime in seconds
 * @returns {string} Formatted uptime string (e.g., "3d 2h 5m 10s")
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  
  return parts.join(' ');
}

/**
 * Handles the health check request and returns the server status.
 * Processes requests to the /health endpoint and generates a response
 * with the current server uptime and status information.
 * 
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @returns {void} Sends a JSON response with the server status and uptime
 */
function healthCheckHandler(req, res) {
  try {
    // Calculate the server uptime in seconds
    const uptimeInSeconds = process.uptime();
    
    // Construct the health status response
    const healthStatus = {
      status: 'UP',
      uptime: {
        seconds: uptimeInSeconds,
        formatted: formatUptime(uptimeInSeconds)
      },
      timestamp: new Date().toISOString()
    };
    
    // Set security and response headers
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff'
    };
    
    // Send the health status as a JSON response with 200 OK status
    res.writeHead(200, headers);
    res.end(JSON.stringify(healthStatus));
  } catch (error) {
    // Log the error
    console.error('Error in health check handler:', error);
    
    // Send an error response
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ERROR',
      message: 'An error occurred while checking health status'
    }));
  }
}

// Export only the health check handler function as specified
module.exports = { healthCheckHandler };