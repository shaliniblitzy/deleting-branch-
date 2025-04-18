# Node.js Hello World HTTP Server

## Overview

This is a simple Node.js HTTP server application that exposes a single REST endpoint `/hello` which returns "Hello world" to clients.

It serves as a minimal, functional example of a Node.js web service that can be used as a learning tool or a starter template.

## Features

-   **HTTP Server**: Implemented using Node.js core `http` module.
-   **REST Endpoint**: Single `/hello` endpoint returning "Hello world".
-   **Plain Text Response**: Returns a plain text response.
-   **Server Configuration**: Configurable port using environment variables.
-   **Error Handling**: Basic error handling for invalid routes.

## Getting Started

### Prerequisites

-   Node.js (v18.x or higher)
-   npm (v9.x or higher)

### Installation

1.  Clone the repository:

    ```bash
    git clone <repository_url>
    ```

2.  Navigate to the project directory:

    ```bash
    cd node-hello-world/backend
    ```

3.  Install the dependencies:

    ```bash
    npm install
    ```

### Configuration

The application can be configured using environment variables.

-   `PORT`: The port on which the server will listen (default: 3000).

    ```bash
    PORT=8080 npm start
    ```

### Running the Application

To start the application, use the following command:

```bash
npm start
```

This will start the server on the configured port (default: 3000).

### Testing the Endpoint

You can test the endpoint using `curl` or any other HTTP client.

```bash
curl http://localhost:3000/hello
```

This should return the following response:

```
Hello world
```

## API Documentation

For more information about the API, see the [API documentation](docs/API.md).

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details on how to contribute to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.