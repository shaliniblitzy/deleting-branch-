# Development Guide

This document provides guidelines and instructions for developers who want to contribute to the Node.js Hello World server project. It covers setting up your development environment, coding standards, and the contribution process.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Contribution Process](#contribution-process)
- [Version Control](#version-control)

## Development Environment Setup

### Prerequisites

- Node.js 18.x LTS or higher (recommended)
- npm 9.x+ (comes with Node.js)
- Git 2.x+

### Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/nodejs-hello-world.git
   cd nodejs-hello-world
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run the server locally**

   ```bash
   npm start
   ```

   This will start the server on port 3000 by default. You can access the hello endpoint at http://localhost:3000/hello

4. **Run in development mode with auto-restart**

   ```bash
   npm run dev
   ```

### Environment Variables

The application supports the following environment variables:

- `PORT`: HTTP server port (default: 3000)

Example usage:

```bash
PORT=8080 npm start
```

## Project Structure

The project follows a simple structure:

```
project-root/
├── src/                  # Source code
│   ├── server.js         # Main server implementation
│   ├── routeHandler.js   # Request route handling
│   ├── errorHandler.js   # Error handling logic
│   └── config.js         # Configuration management
├── __tests__/            # Test files
│   ├── server.test.js
│   ├── routeHandler.test.js
│   ├── errorHandler.test.js
│   └── config.test.js
├── docs/                 # Documentation
│   └── DEVELOPMENT.md    # This file
├── package.json          # Project metadata and dependencies
├── .gitignore            # Git ignore file
└── README.md             # Project overview and usage
```

## Coding Standards

### Style Guide

This project follows standard JavaScript style practices:

- Use 2 spaces for indentation
- Use semicolons at the end of statements
- Use single quotes for strings
- Maximum line length of 80 characters

### Naming Conventions

- **Files**: Use camelCase for file names (e.g., `routeHandler.js`)
- **Variables and Functions**: Use camelCase (e.g., `handleHelloRoute`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `DEFAULT_PORT`)
- **Classes**: Use PascalCase (e.g., `ServerManager`)

### Code Documentation

- Add JSDoc comments for all functions and classes
- Include a brief description and parameter documentation
- Document return values and thrown exceptions

Example:

```javascript
/**
 * Handles requests to the /hello endpoint
 * @param {http.IncomingMessage} req - The HTTP request object
 * @param {http.ServerResponse} res - The HTTP response object
 * @returns {void}
 */
function handleHelloRoute(req, res) {
  // Implementation
}
```

### Error Handling

- Use try/catch blocks for error handling
- Always log meaningful error messages
- Return appropriate HTTP status codes
- Don't expose sensitive error details to clients

## Testing

This project uses Jest for testing.

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode during development
npm run test:watch
```

### Writing Tests

Tests should be organized in the `__tests__` directory with filenames matching the source files they test.

For each component, tests should cover:
- Normal operation (happy path)
- Error handling
- Edge cases

Example test:

```javascript
describe('Route Handler', () => {
  describe('handleHelloRoute', () => {
    it('should return "Hello world" with 200 status code', () => {
      // Arrange
      const req = {};
      const res = {
        writeHead: jest.fn(),
        end: jest.fn()
      };
      
      // Act
      handleHelloRoute(req, res);
      
      // Assert
      expect(res.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/plain'
      });
      expect(res.end).toHaveBeenCalledWith('Hello world');
    });
  });
});
```

### Coverage Requirements

- Maintain at least 90% overall code coverage
- Critical components (routeHandler, errorHandler) should have 100% coverage

## Contribution Process

### Branching Strategy

We follow a simplified Git workflow:

- `main` branch contains stable, production-ready code
- Feature branches should be created for all changes

### Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them with meaningful messages

3. Push your branch to the remote repository:
   ```bash
   git push -u origin feature/your-feature-name
   ```

4. Create a pull request against the `main` branch

### Pull Request Process

1. Ensure your code passes all tests
2. Update documentation if necessary
3. Ensure your code follows the project's coding standards
4. Request a review from a maintainer
5. Address any feedback from code reviews

## Version Control

### Commit Messages

Follow these guidelines for commit messages:

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Fix bug" not "Fixes bug")
- Limit the first line to 72 characters or less
- Reference issues and pull requests after the first line

Example:
```
Add hello endpoint route handler

- Implement GET route for /hello path
- Add content-type header to response
- Return status 200 with "Hello world" message

Fixes #123
```

### Code Review Guidelines

- Review for functionality, style, and performance
- Ensure all tests pass
- Check for adequate test coverage
- Verify documentation is updated

## License

This project is licensed under the MIT License - see the LICENSE file for details.