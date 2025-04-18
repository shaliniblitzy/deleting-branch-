# Node.js Hello World API Documentation

## Introduction

This document provides detailed information about the API endpoints available in the Node.js Hello World application. The application exposes simple REST endpoints that demonstrate basic HTTP server functionality using Node.js core modules.

## Base URL

All API endpoints are relative to the base URL where the server is running. By default, the server runs on `http://localhost:3000`.

## Authentication

This API does not require authentication.

## Response Formats

Responses are returned in plain text format unless otherwise specified.

## Endpoints

### Hello Endpoint

**URL:** `/hello`

**Method:** `GET`

**Description:** Returns a simple 'Hello world' message.

**Request Parameters:** None

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** text/plain
- **Body:** Hello world

**Example:**
```
Request:
GET /hello HTTP/1.1
Host: localhost:3000

Response:
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 11

Hello world
```

**Error Responses:**
- **Status Code:** 405 Method Not Allowed
- **Content-Type:** text/plain
- **Body:** Method Not Allowed
- **Headers:** `Allow: GET`
- **Description:** Returned when a non-GET HTTP method is used.

### Health Check Endpoint

**URL:** `/health`

**Method:** `GET`

**Description:** Returns the current health status of the server, including uptime information.

**Request Parameters:** None

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Body:**
  ```json
  {
    "status": "up",
    "uptime": "time in seconds"
  }
  ```

**Example:**
```
Request:
GET /health HTTP/1.1
Host: localhost:3000

Response:
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 29

{"status":"up","uptime":123.45}
```

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests.

| Status Code | Description | Response Body | Content-Type | Additional Headers |
|-------------|-------------|---------------|--------------|-------------------|
| 404 Not Found | Returned when a request is made to an undefined route. | Not Found | text/plain | - |
| 405 Method Not Allowed | Returned when a request uses an HTTP method that is not supported by the endpoint. | Method Not Allowed | text/plain | Allow: GET |
| 500 Internal Server Error | Returned when an unexpected error occurs on the server. | Internal Server Error | text/plain | - |

## Testing the API

You can test the API using various tools:

### cURL

```bash
curl http://localhost:3000/hello
```

### Web Browser

Navigate to http://localhost:3000/hello in your web browser

### Postman

Create a new GET request to http://localhost:3000/hello

## Rate Limiting

This API does not implement rate limiting.

## Versioning

This API does not implement versioning as it is a simple demonstration application.