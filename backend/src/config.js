/**
 * Configuration module for the Node.js application.
 * Handles loading configuration settings from environment variables and providing default values.
 * @module config
 */

/**
 * Default port number for the HTTP server
 * @constant {number}
 */
const DEFAULT_PORT = 3000;

/**
 * Retrieves the port number from the environment variables or uses the default value.
 * This allows the application to be configured via environment variables, which is
 * a common practice for Node.js applications and follows 12-factor app methodology.
 * 
 * @returns {number} The port number to listen on.
 */
function getPort() {
  // Read the PORT environment variable
  const envPort = process.env.PORT;
  
  // If the PORT environment variable is not set, use the default value of 3000
  if (!envPort) {
    return DEFAULT_PORT;
  }
  
  // Parse the PORT environment variable as an integer
  const port = parseInt(envPort, 10);
  
  // If the parsed value is not a valid number, use the default value
  if (isNaN(port)) {
    console.warn(`Invalid PORT value: "${envPort}". Using default port ${DEFAULT_PORT}.`);
    return DEFAULT_PORT;
  }
  
  // If the port is outside the valid range, use the default value
  // Valid ports are typically in the range 1-65535, but ports below 1024 often require privileged access
  if (port < 1 || port > 65535) {
    console.warn(`Port value out of range: ${port}. Using default port ${DEFAULT_PORT}.`);
    return DEFAULT_PORT;
  }
  
  return port;
}

module.exports = {
  getPort
};