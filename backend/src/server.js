/**
 * Core HTTP Server Module
 * 
 * This module implements a Node.js HTTP server that listens for incoming
 * client requests and routes them to appropriate handlers. It provides
 * functions for creating, starting, and stopping the server.
 * 
 * @module server
 */

// Import the Node.js core HTTP module - version: core module
const http = require('http');

// Import configuration
const { getPort } = require('./config');

// Import route handlers
const { 
  handleHelloRoute,
  handleNotFound,
  handleMethodNotAllowed
} = require('./routeHandler');

// Import error handlers
const {
  handleServerError,
  logServerStartupError
} = require('./errorHandler');

// Import health check handler
const { healthCheckHandler } = require('./health');

/**
 * Main request handler function that routes incoming requests to 
 * the appropriate endpoint handlers.
 * 
 * @param {http.IncomingMessage} req - The HTTP request object
 * @param {http.ServerResponse} res - The HTTP response object
 */
function handleRequest(req, res) {
  try {
    // Extract the URL path from the request
    let path;
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      path = url.pathname;
    } catch (error) {
      // If the URL is malformed, use the raw path
      path = req.url.split('?')[0];
    }
    
    // Extract the HTTP method from the request
    const method = req.method;
    
    // Route the request based on the path
    if (path === '/hello') {
      // If path is '/hello', check if method is GET
      if (method === 'GET') {
        // If method is GET, call handleHelloRoute
        handleHelloRoute(req, res);
      } else {
        // If method is not GET, call handleMethodNotAllowed
        handleMethodNotAllowed(res, ['GET']);
      }
    } else if (path === '/health') {
      // If path is '/health', call healthCheckHandler
      healthCheckHandler(req, res);
    } else {
      // If path is not recognized, call handleNotFound
      handleNotFound(res);
    }
  } catch (error) {
    // If an error occurs, call handleServerError
    handleServerError(res, error);
  }
}

/**
 * Creates and returns an HTTP server instance configured with request handlers.
 * 
 * @returns {http.Server} An instance of the HTTP server
 */
function createServer() {
  // Create a new HTTP server instance
  const server = http.createServer(handleRequest);
  
  // Return the server instance
  return server;
}

/**
 * Formats a server startup message with timestamp and port information.
 * 
 * @param {number} port - The port number the server is listening on
 * @returns {string} Formatted startup message
 */
function formatStartupMessage(port) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] Server started and listening on port ${port}`;
}

/**
 * Starts the HTTP server on the configured port.
 * 
 * @param {http.Server} server - The server instance to start
 * @returns {Promise<void>} A promise that resolves when the server starts successfully
 */
function start(server) {
  // Get the port number from the configuration
  const port = getPort();
  
  // Return a new Promise that resolves when the server starts
  return new Promise((resolve, reject) => {
    try {
      // Handle server errors
      server.on('error', (error) => {
        // Check for specific error types
        if (error.code === 'EADDRINUSE') {
          const errorMessage = `Port ${port} is already in use`;
          logServerStartupError(new Error(errorMessage));
          reject(new Error(errorMessage));
        } else if (error.code === 'EACCES') {
          const errorMessage = `Insufficient permissions to bind to port ${port}`;
          logServerStartupError(new Error(errorMessage));
          reject(new Error(errorMessage));
        } else {
          // Generic server error
          logServerStartupError(error);
          reject(error);
        }
      });
      
      // Start listening on the configured port
      server.listen(port, () => {
        // Log server startup
        console.log(formatStartupMessage(port));
        resolve();
      });
    } catch (error) {
      // Catch any synchronous errors during server startup
      logServerStartupError(error);
      reject(error);
    }
  });
}

/**
 * Gracefully stops the HTTP server.
 * 
 * @param {http.Server} server - The server instance to stop
 * @returns {Promise<void>} A promise that resolves when the server stops successfully
 */
function stop(server) {
  return new Promise((resolve, reject) => {
    // If the server is already closed or not initialized
    if (!server || !server.listening) {
      resolve();
      return;
    }
    
    // Attempt to close the server
    server.close((error) => {
      if (error) {
        console.error(`Error shutting down server: ${error.message}`);
        reject(error);
        return;
      }
      
      console.log(`[${new Date().toISOString()}] Server shutdown complete`);
      resolve();
    });
  });
}

// Export the public API of this module
module.exports = {
  createServer,
  start,
  stop
};