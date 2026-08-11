# node-hello-world

A Node.js tutorial project with exactly one HTTP endpoint: `GET /hello`, which returns the plain-text body `Hello world` to the calling HTTP client. It is built on the Node.js core `http` module and has **zero runtime dependencies and zero development dependencies**, so `npm install` fetches nothing and the project runs straight from a clone.

The source is small and heavily commented on purpose, so you can read the HTTP mechanics rather than a framework's abstraction over them. `src/server.js` holds the endpoint contract — the one path it recognises and the exact bytes it returns — and `index.js` holds the process lifecycle: choosing a port, binding it, and shutting down cleanly.

## Features

- One endpoint, `/hello`, and nothing else. Every other path answers `404`.
- The response body is exactly `Hello world` — 11 bytes of `text/plain`, with no trailing newline.
- Zero dependencies. Both `dependencies` and `devDependencies` are empty, and no `node_modules` directory is ever created.
- Defined answers for the cases even a single-route server has to handle: `404` for an unknown path, and `405` with an `Allow` header for a disallowed method.
- The listening port is configurable through the `PORT` environment variable, with validation and a documented fallback.
- Graceful shutdown on `SIGINT` and `SIGTERM`: the server stops accepting new connections, lets in-flight requests finish, and exits with status `0`.
- One automated test, written with runtime built-ins only — the Node.js test runner, its strict assertion module, and the global `fetch`.

## Prerequisites

- **Node.js `>=24.0.0`** — the same range declared as `engines.node` in `package.json`. Everything documented here was verified on **v24.19.0**, the Active LTS line.
- **npm**, which ships with Node.js, to run the `start` and `test` scripts.

Nothing else is required: no database, no build step, no global tooling, and no third-party packages.

Confirm what you have:

```bash
node --version
npm --version
```

## Installation

```bash
npm install
```

There is nothing to fetch. The project declares no dependencies, so this command resolves zero packages, creates **no `node_modules` directory**, and prints the following, give or take the elapsed time:

```text
up to date, audited 1 package in 120ms

found 0 vulnerabilities
```

It also writes `package-lock.json` if that file is missing, which pins the install state so `npm ci` is reproducible. Because nothing is ever downloaded, you can skip this step entirely and run the server directly from a fresh clone.

To see the empty dependency tree for yourself:

```bash
npm ls --all
```

```text
node-hello-world@1.0.0 /path/to/node-hello-world
└── (empty)
```

## Running the server

Either of these starts it:

```bash
npm start
```

```bash
node index.js
```

Both run the same command, because `npm start` is defined as `node index.js`.

Prefer the direct `node index.js` form in signal-sensitive contexts — a process manager, a container entrypoint, or a script that sends `SIGTERM`. npm forwards termination signals to the child process it spawned, but it does not wait for that child to finish stopping, so the shell can return before the server has actually closed. Running Node directly removes the middleman and lets the server receive the signal itself.

On a successful start the server prints a single line:

```text
[2026-01-01T00:00:00.000Z] Listening on http://localhost:3000/hello
```

The timestamp is the current time in ISO-8601 form, so yours will differ. The line carries the full URL of the endpoint so you can follow it straight from the terminal.

Press Ctrl+C to stop. The shutdown is graceful and reports both steps before the process exits with status `0`:

```text
[2026-01-01T00:00:00.000Z] Received SIGINT, closing server.
[2026-01-01T00:00:00.000Z] Server closed.
```

## Verifying it works

Leave the server running and use a second terminal.

```bash
curl -i http://localhost:3000/hello
```

```text
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 11
X-Content-Type-Options: nosniff
Cache-Control: no-store
Date: Thu, 01 Jan 2026 00:00:00 GMT
Connection: keep-alive
Keep-Alive: timeout=5

Hello world
```

The first four header lines come from the endpoint itself. `Date`, `Connection` and `Keep-Alive` are added by the Node.js `http` module, and the `Date` value naturally varies.

The body is byte-exact, which you can confirm rather than take on trust:

```bash
curl -s http://localhost:3000/hello | od -c
```

```text
0000000   H   e   l   l   o       w   o   r   l   d
0000013
```

That is eleven characters and nothing else. The final offset `0000013` is octal for 11, and the absence of a `\n` before it shows there is no trailing newline.

A `HEAD` request returns the same status and the same headers with no body at all:

```bash
curl -I http://localhost:3000/hello
```

```text
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 11
X-Content-Type-Options: nosniff
Cache-Control: no-store
Date: Thu, 01 Jan 2026 00:00:00 GMT
Connection: keep-alive
Keep-Alive: timeout=5
```

`Content-Length: 11` still describes the size of the resource, which is what HTTP asks a `HEAD` response to report.

## Endpoint reference

| Request | Status | Headers | Body |
| --- | --- | --- | --- |
| `GET /hello` | `200 OK` | `Content-Type: text/plain; charset=utf-8`, `Content-Length: 11`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store` | `Hello world` — 11 bytes, no trailing newline |
| `HEAD /hello` | `200 OK` | identical to `GET /hello` | empty, as HTTP specifies for `HEAD` |
| `GET /hello/`, `GET /hello//`, `GET /hello?a=1` | `200 OK` | as above | `Hello world` — trailing slashes are normalised away and a query string does not affect routing |
| `GET /`, or any other path | `404 Not Found` | the same four headers, with `Content-Length: 9` | `Not Found` |
| `POST`, `PUT`, `DELETE`, or any other method on `/hello` | `405 Method Not Allowed` | the same four headers, plus `Allow: GET, HEAD`, with `Content-Length: 18` | `Method Not Allowed` |

Those three status codes are the only ones the server emits. Answering a disallowed method with `405` and an `Allow` header — rather than a `404` — is the distinction worth noticing here: the resource does exist, just not for that method.

Try the two failure cases yourself:

```bash
curl -o /dev/null -w '%{http_code}\n' http://localhost:3000/
curl -i -X POST http://localhost:3000/hello
```

## Configuration

There is exactly one setting.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | The TCP port the server listens on |

```bash
PORT=8081 node index.js
```

```text
[2026-01-01T00:00:00.000Z] Listening on http://localhost:8081/hello
```

The value is parsed base 10 and has to be a whole number from 0 to 65535. A value that cannot be used is reported rather than silently ignored: the warning names the offending value and the port used instead, then the server starts on the default.

```bash
PORT=not-a-number node index.js
```

```text
Invalid PORT "not-a-number"; falling back to 3000.
[2026-01-01T00:00:00.000Z] Listening on http://localhost:3000/hello
```

Leaving `PORT` unset or empty is the ordinary case and falls back to `3000` without a warning.

Two startup failures are reported in plain language instead of an opaque stack trace, and both exit with status `1`:

```text
Port 3000 is already in use.
```

```text
Insufficient permissions to bind to port 80.
```

Each message names the port that actually failed. The first is by far the most likely on a first run — something else already holds the port, so pick another one with `PORT`. The second appears when your user is not allowed to bind the port it asks for, which on Unix-like systems usually means a port below 1024.

There is no `.env` file and no environment-file loader. `PORT` is read straight from the process environment.

## Running the tests

```bash
npm test
```

That runs `node --test`, the test runner built into Node.js. There is no third-party test framework to install.

```text
> node-hello-world@1.0.0 test
> node --test

✔ GET /hello responds 200 with the exact payload as plain text
✔ a request for any other path responds 404
✔ a disallowed method on /hello responds 405 and advertises what is allowed
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

Three tests pass, none fail, and the command exits with status `0`. The runner also prints a duration for each test and for the run as a whole, which varies from run to run.

The suite asks the operating system for a free port by binding port `0` on the loopback interface, so it never collides with a server you already have running — you can leave one up on port 3000 and run the tests at the same time.

## Project layout

```text
.
├── .gitignore
├── README.md
├── index.js
├── package-lock.json
├── package.json
├── src/
│   └── server.js
└── tests/
    └── hello.test.js
```

- `index.js` — the entry point named by `main`. Resolves the port, binds it, logs the ready line, translates bind failures into plain language, and handles `SIGINT` and `SIGTERM`.
- `src/server.js` — the HTTP contract: route matching and the three response writers. Importing it is inert, binding no port and printing nothing, which is what lets the test suite create its own server.
- `tests/hello.test.js` — the automated verification of the endpoint contract.
- `package.json` — package identity, the `start` and `test` scripts, the supported Node.js range, and the two empty dependency objects.
- `package-lock.json` — the resolved install state, which is empty because there is nothing to resolve.
- `.gitignore` — keeps generated state out of version control.
- `README.md` — this document.
