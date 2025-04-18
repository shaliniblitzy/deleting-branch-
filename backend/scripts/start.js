/**
 * Server Startup Script
 * 
 * This script starts the Node.js HTTP server using the configuration
 * specified in the config module. It creates a server instance and
 * begins listening on the configured port.
 * 
 * Implements:
 * - F-001: HTTP Server - Starts the HTTP server using Node.js core modules
 * - F-003: Server Configuration - Uses configured port from environment or default
 */

// Import the server creation function
const { createServer } = require('../src/server');

// Import the getPort function and create a config object with a port property
const { getPort } = require('../src/config');
const config = { port: getPort() };

/**
 * Starts the HTTP server and listens on the configured port.
 * 
 * @returns {Promise<void>} A promise that resolves when the server starts successfully or rejects if an error occurs.
 */
async function startServer() {
  try {
    // Create the HTTP server instance
    const server = createServer();
    
    // Start the server and listen on the configured port
    server.listen(config.port, () => {
      console.log(`Server started successfully and is listening on port ${config.port}`);
      console.log(`Visit http://localhost:${config.port}/hello to see the Hello World message`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Error: Port ${config.port} is already in use`);
        process.exit(1);
      } else if (error.code === 'EACCES') {
        console.error(`Error: Insufficient permissions to bind to port ${config.port}`);
        process.exit(1);
      } else {
        console.error(`Server error: ${error.message}`);
        process.exit(1);
      }
    });
    
    // Setup graceful shutdown
    process.on('SIGINT', () => {
      console.log('Received SIGINT. Shutting down gracefully...');
      server.close(() => {
        console.log('Server has been gracefully stopped');
        process.exit(0);
      });
      
      // Force close if graceful shutdown fails
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    });
    
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM. Shutting down gracefully...');
      server.close(() => {
        console.log('Server has been gracefully stopped');
        process.exit(0);
      });
      
      // Force close if graceful shutdown fails
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    });
    
  } catch (error) {
    // Handle any errors that occur during server startup
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Start the server when this script is run
startServer();