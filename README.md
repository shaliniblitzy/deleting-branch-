# node-hello-world

A Node.js tutorial project with exactly one HTTP endpoint: `GET /hello`, which returns the plain-text body `Hello world` to the calling HTTP client. It is built on the Node.js core `http` module and declares **zero runtime dependencies and zero development dependencies**, so there is no dependency package to download and the project runs straight from a clone.

The source is small and heavily commented on purpose, so you can read the HTTP mechanics rather than a framework's abstraction over them. `src/server.js` holds the endpoint contract — the one path it recognises and the exact bytes it returns — and `index.js` holds the process lifecycle: choosing a port, binding it, and shutting down cleanly.

## Features

- One endpoint, `/hello`, and nothing else. The path is compared against what the client actually sent, so every other path answers `404` — including spellings that a URL parser would fold into `/hello`, such as `/x/../hello` or `/hello/%2e`.
- The response body is exactly `Hello world` — 11 bytes of `text/plain`, with no trailing newline.
- Zero dependencies. Both `dependencies` and `devDependencies` are empty, so no dependency package is declared or downloaded — and on the environment this project was verified on, installing created no `node_modules` directory at all.
- Defined answers for the cases even a single-route server has to handle: `404` for an unknown path, and `405` with an `Allow` header for a disallowed method.
- The listening port is configurable through the `PORT` environment variable, with validation and a documented fallback.
- Graceful shutdown on `SIGINT` and `SIGTERM`: the server stops accepting new connections, lets in-flight requests finish, and exits with status `0`.
- One automated test file with three cases, one per answer the endpoint gives — the `GET /hello` status, body and content type; a `404` for the root path; and a `405` with `Allow` for a disallowed method — written with runtime built-ins only: the Node.js test runner, its strict assertion module, and the global `fetch`.

## Prerequisites

- **Node.js `>=24.0.0`** — the same range declared as `engines.node` in `package.json`. Everything documented here was verified on **v24.19.0**, the Active LTS line.
- **npm**, which ships with Node.js, to run the `start` and `test` scripts.

The project itself needs nothing else: no database, no build step, and no third-party packages.

The examples are written for a POSIX-compatible shell — bash or zsh — and use `curl` to make requests. Two of them reach a little further: `PORT=8081 node index.js` puts a variable in front of a command, which PowerShell and `cmd.exe` spell differently, and the optional byte-level check pipes into `od`, a utility that ships with macOS and Linux but not with Windows. Both have an alternative given alongside them below, so nothing here needs a tool you have to install.

Confirm what you have:

```bash
node --version
npm --version
```

## Installation

```bash
npm install
```

There is no dependency package to fetch. On the environment this project was verified on — Node.js v24.19.0 with the bundled npm 11.17.0 and npm's default settings — the command resolved zero dependency packages, created **no `node_modules` directory**, and reported zero vulnerabilities. Treat the output below as representative rather than exact: npm varies its wording between versions and configurations, and the elapsed time is different every run.

```text
up to date, audited 1 package in 120ms

found 0 vulnerabilities
```

That `audited 1 package` line is npm auditing this package itself, which is a step npm performs on install by default — so "no dependency package to download" is a narrower claim than "no network access". Add `--no-audit` if you want the install to skip it.

It also writes `package-lock.json` if that file is missing, which pins the install state so `npm ci` is reproducible. Since there is no dependency to install, you can skip this step entirely and run the server directly from a fresh clone.

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

Prefer the direct `node index.js` form in signal-sensitive contexts — a process manager, a container entrypoint, or a script that sends `SIGTERM`. npm forwards termination signals to the child process it spawned, but it does not wait for that child to finish stopping, so the shell can return before the server has actually closed. Running Node directly removes the middleman and lets the server receive the signal itself.

On a successful start the server prints a single line:

```text
[2026-01-01T00:00:00.000Z] Listening on http://localhost:3000/hello
```

The timestamp is the current time in ISO-8601 form, so yours will differ. The line carries the full URL of the endpoint so you can follow it straight from the terminal, and the port in that URL is read back from the bound socket — so it is always the port the server is really listening on, which matters if you asked the operating system to pick one (see [Configuration](#configuration)).

**Who can reach it.** That `localhost` URL is how you reach the server from the same machine, but it is not the limit of what the server accepts. `index.js` calls `listen` with a port and no host, and Node.js documents that as binding the unspecified address — `::` where IPv6 is available, otherwise `0.0.0.0` — so the server answers on every network interface the machine has, your local network address included. Anything that can route to your machine on this port can therefore fetch this greeting, which is handy when you want to try the endpoint from another device and worth knowing about before you run it anywhere else. There is nothing here to take — the response is a constant and the request is never read — but an open port is still an open port: on a shared or untrusted network, block it at your firewall, or only start the server where that traffic is welcome.

Press Ctrl+C to stop. The shutdown is graceful and reports two lines before the process exits with status `0`:

```text
[2026-01-01T00:00:00.000Z] Received SIGINT, closing server.
[2026-01-01T00:00:00.000Z] Server closed.
```

Closing waits for the requests already in flight, so if any are still running the wait is real: the second line, and the exit that goes with it, follow once those requests have finished.

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

If you have no `od` — on Windows, for instance — Node.js can count the bytes itself, and this form runs the same in every shell:

```bash
node -e "fetch('http://localhost:3000/hello').then(r => r.bytes()).then(b => console.log(b.length, JSON.stringify(new TextDecoder().decode(b))))"
```

```text
11 "Hello world"
```

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
| `GET /x/../hello`, `GET /hello/.`, `GET /hello/%2e`, sent verbatim | `404 Not Found` | as above | `Not Found` — these are other paths, not aliases of the endpoint |
| `POST`, `PUT`, `DELETE`, or any other method on `/hello` | `405 Method Not Allowed` | the same four headers, plus `Allow: GET, HEAD`, with `Content-Length: 18` | `Method Not Allowed` |

Those three answers are everything the endpoint has to say, and every request that reaches routing gets one of them. What sits outside the table is the request that never becomes a request: a missing or unusable `Host` header, a malformed request line, headers larger than the runtime allows, or a client that stops speaking mid-request. Node.js answers those itself before routing begins, and those built-in protections are deliberately left in place — they are what stops a half-sent request from occupying the server indefinitely.

Answering a disallowed method with `405` and an `Allow` header — rather than a `404` — is the distinction worth noticing here: the resource does exist, just not for that method.

The row about verbatim alias spellings is the one worth a second look, because it is where "exactly one endpoint" is either true or merely claimed. `src/server.js` compares the path the client sent against the string `/hello`, forgiving a trailing slash and ignoring a query string and nothing else. It deliberately does **not** hand the request target to Node's `URL` parser first: that parser resolves `.` and `..` segments as well as their percent-encoded spellings, so targets such as `/x/../hello`, `/./hello`, `/hello/.` and `/hello/%2e` would all reach the router already rewritten as `/hello` and would answer `200` — a handful of extra names for an endpoint documented as having one. Note that most clients tidy such paths up before the request is ever sent (`curl` needs `--path-as-is` to send one verbatim), so seeing the `404` takes a client that leaves the path alone.

Try the failure cases yourself. The third needs `--path-as-is`, which tells `curl` to send the path exactly as written instead of tidying it up first — without that flag `curl` resolves the `..` itself and you end up asking for `/hello`, which of course answers `200`:

```bash
curl -o /dev/null -w '%{http_code}\n' http://localhost:3000/
curl -i -X POST http://localhost:3000/hello
curl --path-as-is -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/x/../hello'
```

## Configuration

There is exactly one setting. The port is all you can choose — there is no host setting, and the server always accepts connections on every interface, as described under [Running the server](#running-the-server).

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | The TCP port the server listens on |

```bash
PORT=8081 node index.js
```

In PowerShell, set the variable first — a leading `PORT=8081` is not something PowerShell or `cmd.exe` understands:

```powershell
$env:PORT = '8081'; node index.js
```

Either way:

```text
[2026-01-01T00:00:00.000Z] Listening on http://localhost:8081/hello
```

The whole value has to be a base-10 whole number from 0 to 65535 and nothing else — digits alone, with no surrounding spaces. It is checked in full rather than read up to the first character that does not fit, so `3000junk`, `1.5`, `1e3` and `0x10` are all refused instead of quietly becoming 3000, 1, 1 and 0 — a mistyped setting never silently lands you on a different port from the one you asked for.

Asking for port `0` is the one special case: it means "any free port the operating system has", and the readiness line then names the port it granted, so you can still see where to send your request.

A value that cannot be used is reported rather than silently ignored. The warning quotes the offending value — escaped, so whatever the variable happened to contain stays on that one line — and names the port used instead, then the server starts on the default:

```bash
PORT=not-a-number node index.js
```

```text
Invalid PORT "not-a-number"; falling back to 3000.
[2026-01-01T00:00:00.000Z] Listening on http://localhost:3000/hello
```

The same `$env:PORT = 'not-a-number'; node index.js` substitution applies in PowerShell.

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

The three results are the contract; the layout around them is not. What follows is representative output from the `spec` reporter, which is the default on Node.js 24 — pass `--test-reporter=tap` for TAP instead, and note that Node.js documents reporter output as subject to change between versions. Durations differ on every run.

```text
> node-hello-world@1.0.0 test
> node --test

✔ GET /hello responds 200 with the exact payload as plain text (27.717848ms)
✔ GET / responds 404 (2.337770ms)
✔ a disallowed method on /hello responds 405 and advertises what is allowed (2.794300ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 112.685011
```

Whatever the reporter prints around them, three things must hold: `pass 3`, `fail 0`, and an exit status of `0`. Check the last one with `npm test; echo $?`.

Each case is named for the request it actually makes, so read the names as the exact extent of the automated coverage. The 404 case asks about `/` and only `/`: the wider rule — that every path other than `/hello` answers `404` — is settled by the single equality that does the routing in `src/server.js` and by the two failure-case commands in [Endpoint reference](#endpoint-reference), not by this run. The same goes for everything the three names do not mention: `HEAD`, the trailing-slash and query-string variants, `Content-Length` and the two protective headers, the `PORT` setting and the shutdown behaviour are all checked by hand, against the transcripts and the endpoint reference above.

The suite asks the operating system for a free port by binding port `0` on the loopback interface, so it never collides with a server you already have running — you can leave one up on port 3000 and run the tests at the same time. Every request and both lifecycle hooks carry a five-second deadline, so a server that accepted a connection and then said nothing would fail the run promptly instead of leaving it to hang.

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
- `tests/hello.test.js` — three automated cases, run against a real server on a port the operating system picks: the `GET /hello` status, body and content type; the root-path `404`; and the `405` with `Allow`. The rest of the documented behaviour — `HEAD`, the slash and query variants, the exact headers, `PORT` handling and shutdown — is checked by hand with the commands in this README.
- `package.json` — package identity, the `start` and `test` scripts, the supported Node.js range, and the two empty dependency objects.
- `package-lock.json` — the resolved install state: a root-only lockfile recording this package's own name, version, licence and Node.js range, with no dependency entries.
- `.gitignore` — three rules, `node_modules/`, `*.log` and `.env`. The generated lockfile is deliberately tracked rather than ignored, so an install is reproducible from a clone.
- `README.md` — this document.
