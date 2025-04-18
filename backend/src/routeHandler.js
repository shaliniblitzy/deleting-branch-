/**
 * Route Handler Component
 * 
 * This module contains handlers for HTTP routes in the application.
 * It implements handlers for the '/hello' endpoint and error cases
 * such as undefined routes and disallowed HTTP methods.
 * 
 * @module routeHandler
 */

/**
 * Handles requests to the /hello endpoint.
 * Returns 'Hello world' with a 200 status code.
 * 
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 */
const handleHelloRoute = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'",
    'Cache-Control': 'no-store'
  });
  res.end('Hello world');
};

/**
 * Handles requests to undefined routes.
 * Returns a 404 status code.
 * 
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 */
const handleNotFound = (req, res) => {
  res.writeHead(404, {
    'Content-Type': 'text/plain',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'",
    'Cache-Control': 'no-store'
  });
  res.end('Not Found');
};

/**
 * Handles requests with disallowed HTTP methods.
 * Returns a 405 status code.
 * 
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 */
const handleMethodNotAllowed = (req, res) => {
  res.writeHead(405, {
    'Content-Type': 'text/plain',
    'Allow': 'GET',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'",
    'Cache-Control': 'no-store'
  });
  res.end('Method Not Allowed');
};

// Export the route handlers for use in other modules
module.exports = {
  handleHelloRoute,
  handleNotFound,
  handleMethodNotAllowed
};