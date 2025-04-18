/**
 * Entry point for the Node.js HTTP server application
 * 
 * This file initializes and starts the HTTP server that serves the `/hello` endpoint.
 * It handles server creation, startup, and proper shutdown on process termination.
 */

// Import server functions from the server module
const { createServer, start, stop } = require('./src/server');

// Create the HTTP server instance
const server = createServer();

// Define a function to gracefully shut down the server
async function shutdownGracefully() {
  console.log('Shutting down server gracefully...');
  try {
    await stop(server);
    process.exit(0);
  } catch (error) {
    console.error('Error during server shutdown:', error);
    process.exit(1);
  }
}

// Register process event handlers for graceful shutdown
process.on('SIGINT', shutdownGracefully);  // Ctrl+C
process.on('SIGTERM', shutdownGracefully); // kill command

// Start the server
start(server)
  .then(() => {
    console.log('Server initialization complete');
  })
  .catch((error) => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  });