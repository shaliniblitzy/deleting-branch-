## Usage

This document provides instructions on how to run and interact with the Node.js Hello World application.

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.x LTS or higher) installed on your system.
- [npm](https://www.npmjs.com/) (Node Package Manager) - usually comes with Node.js installation.

### Running the Application

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd <repository_name>
    ```

2.  **Install dependencies (if any):**

    ```bash
    npm install
    ```

3.  **Start the server:**

    ```bash
    npm start
    ```

    or

    ```bash
    node server.js
    ```

4.  **Access the application:**

    Open your web browser or use a tool like `curl` to access the application's endpoint:

    ```bash
    curl http://localhost:3000/hello
    ```

    This should return the response:

    ```text
    Hello world
    ```

### Configuration

The application can be configured using environment variables.

-   `PORT`:  The port on which the server listens for incoming connections. Defaults to `3000` if not specified.

    Example:

    ```bash
    PORT=8080 npm start
    ```

### Interacting with the Application

The application exposes a single endpoint:

-   `GET /hello`:  Returns the "Hello world" message.

### Troubleshooting

-   If you encounter issues, ensure that Node.js is properly installed and that all dependencies are installed.
-   Check the console output for any error messages.
-   Verify that the server is running on the correct port.