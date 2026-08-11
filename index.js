'use strict';

/**
 * index.js — the process entry point.
 *
 * This file binds the HTTP contract to the operating system. It answers the
 * four questions that have nothing to do with the protocol itself:
 *
 * 1. Which port do we listen on?         → {@link resolvePort}
 * 2. How do we announce that we are up?  → the `listen` callback
 * 3. What if the port cannot be bound?   → the `error` listener
 * 4. How do we stop cleanly?             → {@link shutdown}
 *
 * Everything the server actually *says* — the one route it recognises, the
 * bytes it returns and the headers that describe them — lives in
 * `src/server.js` and is deliberately not repeated here. Keeping the protocol
 * apart from the process is what lets the test suite exercise the contract on
 * a port the operating system picks, while this file worries about ports,
 * logging and signals and nothing else.
 *
 * Start it with `node index.js`, or with `npm start`, which runs that same
 * command. Nothing needs to be installed first: the project has no
 * dependencies, and every piece used here ships with Node.js.
 *
 * @module index
 */

// The only import in this file. The factory hands back a fully wired but
// unbound server, and requiring it binds nothing and prints nothing, so
// nothing at all happens until the `listen` call at the bottom of this file.
const { createServer } = require('./src/server');

/**
 * The port used whenever the environment does not name a usable one.
 *
 * @constant {number}
 */
const DEFAULT_PORT = 3000;

/**
 * Prefixes a message with the current time in ISO-8601 form, producing lines
 * such as `[2026-01-01T00:00:00.000Z] Server closed.`
 *
 * Every line this file prints is stamped here, so the startup line and the
 * shutdown lines cannot drift into different formats and a reader can always
 * see when each event happened.
 *
 * @param {string} message The text to stamp.
 * @returns {string} The message prefixed with a bracketed timestamp.
 */
function timestamped(message) {
  return `[${new Date().toISOString()}] ${message}`;
}

/**
 * Decides which port to listen on.
 *
 * A port written into the source would make this tutorial unusable the moment
 * something else already holds 3000, so the value may be supplied through the
 * `PORT` environment variable instead — and, because anything at all can be
 * put in an environment variable, it is validated before it is trusted.
 *
 * A value that cannot be used is reported rather than silently ignored: the
 * warning names the offending value and the port that will be used instead,
 * so a mistyped setting is obvious in the very first line of output.
 *
 * @param {string|undefined} raw The raw `PORT` value exactly as the
 *   environment supplied it, or `undefined` when it is not set.
 * @returns {number} The supplied port when it is usable, otherwise
 *   {@link DEFAULT_PORT}.
 */
function resolvePort(raw) {
  // An absent or empty value is the ordinary case — a reader who has set
  // nothing has done nothing wrong — so it falls back without a warning.
  if (raw === undefined || raw === '') {
    return DEFAULT_PORT;
  }

  // Environment variables are always text, so the value has to be parsed.
  // Base 10 is stated explicitly rather than left to be inferred, and a value
  // that does not begin with digits parses to NaN.
  const parsed = Number.parseInt(raw, 10);

  // A port has to be a whole number no larger than 65535, the largest value
  // the TCP port field can hold. Zero is accepted and means "let the operating
  // system pick a free port", which is how a test can bind without colliding
  // with a server that is already running. NaN is not an integer, so this one
  // condition rejects both an unparseable value and an out-of-range one.
  if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 65535) {
    return parsed;
  }

  console.warn(`Invalid PORT "${raw}"; falling back to ${DEFAULT_PORT}.`);
  return DEFAULT_PORT;
}

const port = resolvePort(process.env.PORT);
const server = createServer();

/**
 * Shuts the process down in response to a termination signal.
 *
 * @param {string} signal The signal that arrived — `SIGINT` or `SIGTERM`.
 * @returns {void}
 */
function shutdown(signal) {
  console.log(timestamped(`Received ${signal}, closing server.`));

  // `close` is the primitive that makes this graceful: it stops the server
  // accepting new connections and calls back only once the connections already
  // in flight have finished. Exiting any earlier would cut those requests off
  // mid-response, which is why the exit lives inside the callback.
  server.close(() => {
    console.log(timestamped('Server closed.'));
    process.exit(0);
  });
}

// Registered before `listen`, because the failures it explains happen during
// the bind attempt itself. Without this listener a busy port arrives as an
// unhandled `error` event and an opaque stack trace — the likeliest first-run
// surprise for someone following this tutorial.
server.on('error', (error) => {
  let message;

  if (error.code === 'EADDRINUSE') {
    message = `Port ${port} is already in use.`;
  } else if (error.code === 'EACCES') {
    // Ports below 1024 are reserved for privileged processes on Unix-like
    // systems, which is the usual reason a bind is refused outright.
    message = `Insufficient permissions to bind to port ${port}.`;
  } else {
    // Anything unforeseen is still worth saying out loud, in the runtime's own
    // words, rather than being swallowed.
    message = error.message;
  }

  console.error(message);

  // A server that cannot bind has nothing left to do, and the non-zero status
  // tells whatever started it that the startup failed.
  process.exit(1);
});

// One handler for both signals, because the wanted outcome is identical. They
// differ only in where they come from: SIGINT is the interactive Ctrl+C a
// reader types in the terminal, while SIGTERM is what process managers and
// orchestrators send. Node hands the signal name to the listener, which is
// what `shutdown` reports.
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// The single line of output on a healthy start. It carries the full URL of the
// endpoint so it can be followed straight from the terminal instead of being
// assembled by hand.
server.listen(port, () => {
  console.log(timestamped(`Listening on http://localhost:${port}/hello`));
});
