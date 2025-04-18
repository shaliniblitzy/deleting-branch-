# Deployment

This document provides instructions on how to deploy the Node.js Hello World application.

## Local Setup

For local development and testing, you can use the following steps:

### Prerequisites

- Node.js (v18 or higher)
- npm (Node Package Manager)

### Steps

1. Clone the repository:
   ```bash
   git clone <repository_url>
   ```
2. Navigate to the project directory:
   ```bash
   cd <project_directory>
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```

The server will start on port 3000 by default. You can configure the port using the `PORT` environment variable.

```bash
PORT=8080 npm start
```

You can also use the `local-setup.sh` script to automate the setup process:

```bash
./infrastructure/deployment/local-setup.sh
```

## Docker Deployment

You can also deploy the application using Docker. The following files are used for Docker deployment:

- `Dockerfile`: Defines the Docker image for the application.
- `docker-compose.yml`: Defines the services for the application.

To build and run the application using Docker, follow these steps:

1. Install Docker and Docker Compose.
2. Navigate to the project directory.
3. Run the following command:
   ```bash
   docker-compose up --build
   ```

This will build the Docker image and start the application in a container.

You can access the application at `http://localhost:3000`.

## Further Information

For more information on how to use the application, see the [Usage Documentation](docs/USAGE.md).

Refer to the main [README.md](README.md) for general project information.