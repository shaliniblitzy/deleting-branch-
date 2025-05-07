/**
 * Error handler component for the Node.js Hello World application.
 * Provides consistent error handling across the application.
 */

/**
 * Sets security-related HTTP headers on responses
 * @param {Object} res - HTTP response object
 */
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('Cache-Control', 'no-store');
}

/**
 * Handles requests to undefined routes by returning a 404 Not Found response
 * @param {Object} res - HTTP response object
 */
function handleNotFound(res) {
  res.writeHead(404, {
    'Content-Type': 'text/plain'
  });
  setSecurityHeaders(res);
  res.end('Not Found');
}

/**
 * Handles requests with unsupported HTTP methods by returning a 405 Method Not Allowed response
 * @param {Object} res - HTTP response object
 * @param {Array} allowedMethods - Array of allowed HTTP methods
 */
function handleMethodNotAllowed(res, allowedMethods) {
  res.writeHead(405, {
    'Content-Type': 'text/plain',
    'Allow': allowedMethods.join(', ')
  });
  setSecurityHeaders(res);
  res.end('Method Not Allowed');
}

/**
 * Handles unexpected server errors by returning a 500 Internal Server Error response
 * @param {Object} res - HTTP response object
 * @param {Error} error - Error object
 */
function handleServerError(res, error) {
  console.error(formatErrorMessage(`Server error: ${error.message}`));
  console.error(error.stack);
  
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  });
  setSecurityHeaders(res);
  res.end('Internal Server Error');
}

/**
 * Logs server startup errors with detailed information
 * @param {Error} error - Error object
 */
function logServerStartupError(error) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: Server startup failed: ${error.message}`);
  console.error(error.stack);
}

/**
 * Formats an error message with a timestamp
 * @param {string} message - Error message
 * @returns {string} Formatted error message with timestamp
 */
function formatErrorMessage(message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] ERROR: ${message}`;
}

module.exports = {
  handleNotFound,
  handleMethodNotAllowed,
  handleServerError,
  logServerStartupError,
  setSecurityHeaders
};