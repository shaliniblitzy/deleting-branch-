alth` endpoint for monitoring application status
- **Server Configuration**: Configurable port using environment variables
- **Error Handling**: Proper handling for invalid routes and methods

## Prerequisites

- Node.js (v18.x LTS or higher)
- npm (v9.x or higher)

## Installation

1. Clone the repository:
```bash
git clone <repository_url>
cd node-hello-world
```

2. Install dependencies:
```bash
npm install
```

## Configuration

The application can be configured using environment variables:

- `PORT`: The port on which the server will listen (default: 3000)

Example:
```bash
PORT=8080 npm start
```

## Usage

Start the server:
```bash
npm start
```

Test the endpoint:
```bash
curl http://localhost:3000/hello
```

Expected response:
```
Hello world
```

Check server health:
```bash
curl http://localhost:3000/health
```

For more detailed usage instructions, see [Usage Documentation](docs/USAGE.md).

## API Documentation

For detailed API documentation, see [API Documentation](docs/API.md).

## Development

### Running in Development Mode

```bash
npm run dev
```

This will start the server with nodemon, which automatically restarts the server when files are changed.

### Testing

Run all tests:
```bash
npm test
```

Run specific test suites:
```bash
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e        # End-to-end tests only
```

Generate test coverage report:
```bash
npm run test:coverage
```

### Linting

```bash
npm run lint      # Check for linting issues
npm run lint:fix  # Fix linting issues automatically
```

For more development information, see [Development Guide](docs/DEVELOPMENT.md).

## Project Structure

```
node-hello-world/
├── backend/             # Backend application code
│   ├── src/             # Source code
│   │   ├── config.js    # Configuration management
│   │   ├── errorHandler.js # Error handling utilities
│   │   ├── health.js    # Health check endpoint
│   │   ├── routeHandler.js # Route handlers
│   │   └── server.js    # HTTP server implementation
│   ├── tests/           # Test files
│   │   ├── unit/        # Unit tests
│   │   ├── integration/ # Integration tests
│   │   └── e2e/         # End-to-end tests
│   ├── index.js         # Application entry point
│   └── package.json     # Backend dependencies and scripts
├── docs/                # Documentation
│   ├── API.md           # API documentation
│   ├── CONTRIBUTING.md  # Contribution guidelines
│   ├── DEVELOPMENT.md   # Development guide
│   └── USAGE.md         # Usage instructions
├── infrastructure/      # Deployment and infrastructure files
│   ├── docker/          # Docker configuration
│   └── deployment/      # Deployment scripts
├── .github/             # GitHub configuration files
├── .gitignore           # Git ignore file
├── LICENSE              # License file
└── README.md            # This file
```

## Contributing

Contributions are welcome! Please see [Contributing Guidelines](docs/CONTRIBUTING.md) for details on how to contribute to this project.

## License


