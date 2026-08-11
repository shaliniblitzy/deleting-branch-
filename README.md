# node-hello-world

A Node.js tutorial project with exactly one HTTP endpoint: `GET /hello`, which returns the plain-text body `Hello world` to the calling HTTP client. It is built on the Node.js core `http` module and declares **zero runtime dependencies and zero development dependencies**, so there is no dependency package to download and the project runs straight from a clone.

The source is small and commented, so you can read the HTTP mechanics rather than a framework's abstraction over them. `src/server.js` holds the endpoint contract — the one path it recognises and the exact bytes it returns — and `index.js` holds the process lifecycle: choosing a port, binding it, and shutting down cleanly.

## Features

- One endpoint, `/hello`, and nothing else. The path is compared against what the client actually sent, so every other path answers `404`.
- The response body is exactly `Hello world` — 11 bytes of `text/plain`, with no trailing newline.
- Zero dependencies. Both `dependencies` and `devDependencies` are empty, so no dependency package is declared or downloaded — and on the environment this project was verified on, installing created no `node_modules` directory at all.
- Defined answers for the cases even a single-route server has to handle: `404` for an unknown path, and `405` with an `Allow` header for a disallowed method.
- The listening port is configurable through the `PORT` environment variable, with validation and a documented fallback.
- Graceful shutdown on `SIGINT` and `SIGTERM`: the server stops accepting new connections, lets in-flight requests finish, and exits with status `0`.
- One automated test file with three cases, one per answer the endpoint gives — the `GET /hello` status, body and content type; a `404` for the root path; and a `405` with `Allow` for a disallowed method — written with runtime built-ins only: the Node.js test runner, its strict assertion module, and the global `fetch`.

## Prerequisites

- **Node.js `>=24.0.0`** — the same range declared as `engines.node` in `package.json`. Everything documented here was verified on **v24.19.0**, the Active LTS line.
- **npm**, which ships with Node.js, to run the `start` and `test` scripts.

That range is a compatibility floor, not a security baseline, and the two are not the same thing. `>=24.0.0` admits every patch release in the line, including ones that later security releases have superseded, and `engines` is advice rather than a rule: npm prints an `EBADENGINE` warning and installs anyway unless `engine-strict` is turned on, `npm start` does not check the field at all, and neither does `node index.js`. So run the newest patch release of the Node.js 24 LTS line, not merely a version the range accepts. When this was written — 11 August 2026 — that was **v24.19.0**, released 3 August 2026: the version named above, and the one every command and every output below was verified against. The line is supported until April 2028. `node --version` tells you what you are running, and the [Node.js releases page](https://nodejs.org/en/about/previous-releases) tells you what the current patch release is.

The project itself needs nothing else: no database, no build step, and no third-party packages. The examples below are written for a POSIX-compatible shell and use `curl` to make requests.

## Installation

```bash
npm install
```

There is no dependency package to fetch. On the environment this project was verified on — Node.js v24.19.0 with the bundled npm 11.17.0 and npm's default settings — the command resolved zero dependency packages, created **no `node_modules` directory**, and reported zero vulnerabilities. Treat the output below as representative rather than exact: npm varies its wording between versions and configurations, and the elapsed time is different every run.

```text
up to date, audited 1 package in 120ms

found 0 vulnerabilities
```

The command also writes `package-lock.json` if that file is missing, which pins the install state so `npm ci` is reproducible. Since there is no dependency to install, you can skip this step entirely and run the server directly from a fresh clone.

Skipping it is the safer default too, for a reason that has nothing to do with this project's own code. This project's dependency tree is empty, but the tool you type `npm` into has a tree of its own, and that one is not: the npm bundled with Node.js v24.19.0 is npm 11.17.0, which ships `tar` 7.5.16 and `brace-expansion` 5.0.6. Both carry published denial-of-service advisories. A crafted "gzip bomb" archive can exhaust CPU and disk space through `tar` before 7.5.19 (`CVE-2026-59873`), and a crafted brace or glob pattern can block the event loop or crash the process out of memory through `brace-expansion` before 5.0.8 (`CVE-2026-13149` and `CVE-2026-14257`).

Nothing in this document reaches either one: there is no dependency archive to unpack, and none of the commands here contains a brace or glob pattern. Keeping it that way costs nothing — start the server with `node index.js` and run the suite with `node --test`, both of which work from a fresh clone without installing anything; do not ask this npm to install or unpack an archive you do not trust; and do not hand it a brace or glob pattern that came from a source you do not trust. The exposure goes away once your toolchain bundles `tar` 7.5.19 or later and `brace-expansion` 5.0.8 or later, which is something a newer npm brings with it. To see what your own npm carries:

```bash
node -p "require('$(npm root -g)/npm/node_modules/tar/package.json').version"
node -p "require('$(npm root -g)/npm/node_modules/brace-expansion/package.json').version"
```

On the toolchain this was written against those print `7.5.16` and `5.0.6`. `npm root -g` is simply where npm keeps global packages; if your npm was installed by some other means its layout may differ, and the commands will report a missing module rather than a version.

To see the empty dependency tree for yourself:

```bash
npm ls --all
```

```text
node-hello-world@1.0.0 <your-clone-path>
└── (empty)
```

The first line ends with the directory you cloned into, so yours will read differently; `└── (empty)` is the part that matters — it is npm reporting that the dependency tree has nothing in it.

## Running the server

Either of these starts it:

```bash
npm start
```

```bash
node index.js
```

Both run the same command, because `npm start` is defined as `node index.js`.

Prefer the direct `node index.js` form in signal-sensitive contexts — a process manager, a container entrypoint, or a script that sends `SIGTERM`. Ctrl+C is safe either way, because a terminal delivers the interrupt to every process in the foreground group, the server included, and the shutdown below then happens as documented. The case to avoid is a supervisor that signals only the process it started: measured here on npm 11.17.0, a `SIGTERM` sent to the `npm start` process ends npm and leaves `node index.js` running — orphaned, still holding the port, and never told to stop — while a `SIGINT` sent there is ignored outright. Neither prints the shutdown lines, because the server never sees the signal. Running Node directly removes the middleman and lets the server receive the signal itself.

On a successful start the server prints a single line:

```text
[2026-01-01T00:00:00.000Z] Listening on http://localhost:3000/hello
```

The timestamp is the current time in ISO-8601 form, so yours will differ. The line carries the full URL of the endpoint so you can follow it straight from the terminal, and the port in that URL is read back from the bound socket — so it is always the port the server is really listening on, which matters if you asked the operating system to pick one (see [Configuration](#configuration)).

Press Ctrl+C to stop. The shutdown is graceful and reports two lines before the process exits with status `0`:

```text
[2026-01-01T00:00:00.000Z] Received SIGINT, closing server.
[2026-01-01T00:00:00.000Z] Server closed.
```

Closing waits for the requests already in flight, so if any are still running the wait is real: the second line, and the exit that goes with it, follow once those requests have finished. Both lines are written before the process ends — the server sets its exit status and lets the process finish on its own rather than tearing it down mid-sentence — so you see them even when the output is piped into another command or captured to a file.

That wait is also why a second Ctrl+C stops the server immediately: the first signal takes charge of the shutdown and both handlers then stand down, which hands any further signal back to the operating system's default action. So one Ctrl+C asks the server to finish what it is doing, and a second insists. The trade is the one you would expect — an immediate stop cuts off whatever was still in flight, and prints no second line.

Those two lines are what a shutdown of a running server prints, and the exception is worth naming: if the server never reached the point of listening, closing it is not a clean stop and is not reported as one — the runtime's own explanation is printed in place of the second line and the process ends with status `1`.

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
| `CONNECT /hello` | `405 Method Not Allowed` | as the row above, plus `Connection: close` | `Method Not Allowed` — then the connection closes instead of becoming a tunnel |
| `CONNECT` to any other target, including the usual `host:port` form | `404 Not Found` | the same four headers, plus `Connection: close`, with `Content-Length: 9` | `Not Found` — then the connection closes |

Those three answers are everything the endpoint has to say. Answering a disallowed method with `405` and an `Allow` header — rather than a `404` — is the distinction worth noticing: the resource does exist, just not for that method.

`CONNECT` earns its own two rows because Node.js does not deliver it like the others. It is the method that asks a server to stop serving and start tunnelling, so the runtime hands it to a separate event carrying the raw connection rather than to the request listener — and a server that ignores that event has the connection closed underneath it with nothing said at all. This server answers it instead, by the same two rules as everything else: `/hello` gets the `405` and its `Allow` header, any other target gets the `404`, and the connection then closes, because a refusal is the whole of that conversation. No tunnel is ever opened, in either case.

Try the failure cases yourself. The third points `curl` at the server as if it were a proxy, which is how `curl` is made to send a `CONNECT`; it prints `< HTTP/1.1 404 Not Found` followed by `CONNECT tunnel failed, response 404`, and `curl` then gives up because there is no tunnel:

```bash
curl -o /dev/null -w '%{http_code}\n' http://localhost:3000/
curl -i -X POST http://localhost:3000/hello
curl -v -x http://localhost:3000 https://example.com
```

## Configuration

There is exactly one setting: the port.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | The TCP port the server listens on |

```bash
PORT=8081 node index.js
```

```text
[2026-01-01T00:00:00.000Z] Listening on http://localhost:8081/hello
```

The whole value has to be a base-10 whole number from 0 to 65535 and nothing else — digits alone, with no surrounding spaces. It is checked in full rather than read up to the first character that does not fit, so `3000junk`, `1.5`, `1e3` and `0x10` are all refused instead of quietly becoming 3000, 1, 1 and 0 — a mistyped setting never silently lands you on a different port from the one you asked for.

Asking for port `0` is the one special case: it means "any free port the operating system has", and the readiness line then names the port it granted, so you can still see where to send your request.

A value that cannot be used is reported rather than silently ignored. The warning quotes the offending value and names the port used instead, then the server starts on the default:

```bash
PORT=not-a-number node index.js
```

```text
Invalid PORT "not-a-number"; falling back to 3000.
[2026-01-01T00:00:00.000Z] Listening on http://localhost:3000/hello
```

The value is quoted the way a program would quote it, and everything a terminal might act on rather than show is printed as an escape instead: a newline as `\n`, an escape character as `\u001b`, and — because those are not the only characters that can rearrange a line — the Unicode line and paragraph separators, the C1 controls and the bidirectional direction overrides as `\u2028`, `\u0085`, `\u202e` and so on. An environment variable can hold any of them, so a mistyped or mischievous setting is shown to you rather than allowed to forge a second line of output or reverse the reading order of this one. `PORT=not-a-number` is unaffected by any of that and reads exactly as above.

Leaving `PORT` unset or empty is the ordinary case and falls back to `3000` without a warning.

Two startup failures are reported in plain language instead of an opaque stack trace, and both exit with status `1`:

```text
Port 3000 is already in use.
```

```text
Insufficient permissions to bind to port 80.
```

Each message names the port that actually failed. The first is by far the most likely on a first run — something else already holds the port, so pick another one with `PORT`. The second appears when your user is not allowed to bind the port it asks for, which on Unix-like systems usually means a port below 1024. Either way the message is written and the process then ends by itself with status `1`, so the explanation survives being piped or captured; anything else the runtime reports is passed on in its own words.

There is no `.env` file and no environment-file loader. `PORT` is read straight from the process environment.

## Running the tests

```bash
npm test
```

That runs `node --test`, the test runner built into Node.js. There is no third-party test framework to install.

Three cases run, one per answer the endpoint gives:

```text
✔ GET /hello responds 200 with the exact payload as plain text
✔ GET / responds 404
✔ a disallowed method on /hello responds 405 and advertises what is allowed
ℹ tests 3
ℹ pass 3
ℹ fail 0
```

Durations and the reporter's other totals vary from run to run; what must hold is `pass 3`, `fail 0` and an exit status of `0` — check the last with `npm test; echo $?`.

Each case is named for the request it actually makes, so the names are the exact extent of the automated coverage: everything they do not mention — `HEAD`, the trailing-slash and query-string variants, the exact headers, `PORT` handling and shutdown — is checked by hand with the commands above. The suite binds port `0` on the loopback interface, so it never collides with a server you already have running.

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
- `tests/hello.test.js` — three automated cases, run against a real server on a port the operating system picks: the `GET /hello` status, body and content type; the root-path `404`; and the `405` with `Allow`.
- `package.json` — package identity, the `start` and `test` scripts, the supported Node.js range, and the two empty dependency objects.
- `package-lock.json` — the resolved install state: a root-only lockfile recording this package's own name, version, licence and Node.js range, with no dependency entries.
- `.gitignore` — three rules, `node_modules/`, `*.log` and `.env`. The generated lockfile is deliberately tracked rather than ignored, so an install is reproducible from a clone.
- `README.md` — this document.
