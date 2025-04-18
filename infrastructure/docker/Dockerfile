# Use the official Node.js 18 Alpine image as a lightweight base
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache layers
COPY package*.json ./

# Install production dependencies only
# Using npm ci ensures a clean install matching package-lock.json exactly
RUN npm ci --only=production

# Copy the application code to the container
COPY . .

# Set NODE_ENV to production for optimal performance
ENV NODE_ENV=production

# Document that the container listens on port 3000
EXPOSE 3000

# Configure a health check to monitor application health
# Checks every 30 seconds if the /hello endpoint returns a successful response
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/hello || exit 1

# Switch to non-root user for security best practices
USER node

# Specify the command to run when the container starts
# Uses the npm start script defined in package.json
CMD ["npm", "start"]