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
 * The highest port number a TCP header can carry, and therefore the highest
 * value {@link resolvePort} will accept.
 *
 * @constant {number}
 */
const MAX_PORT = 65535;

/**
 * Matches a value that is a decimal whole number *from end to end* — one or
 * more digits and nothing else.
 *
 * The whole string has to match, because a partial reading is what makes a
 * setting like `PORT=3000abc` dangerous: a parser that stops at the first
 * character it cannot use returns the prefix it managed to read, so `3000abc`
 * becomes 3000, `1.5` becomes 1 and `1e3` becomes 1 — and the server quietly
 * binds a port nobody asked for. Insisting on digits alone also settles the
 * base beyond argument, since `Number('0x10')` is 16 but `0x10` never gets
 * that far.
 *
 * @constant {RegExp}
 */
const DECIMAL_WHOLE_NUMBER = /^\d+$/;

/**
 * Prefixes a message with the current time in ISO-8601 form, producing lines
 * such as `[2026-01-01T00:00:00.000Z] Server closed.`
 *
 * The readiness line and the two shutdown lines are stamped here, so those
 * three cannot drift into different formats and a reader can always see when
 * each event happened. The `PORT` warning and the startup-failure messages are
 * deliberately left unstamped: each is printed before, or instead of, a
 * successful start, and each is a fixed sentence the README quotes verbatim.
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
 * A value is usable when the whole of it is a decimal whole number from 0 to
 * {@link MAX_PORT}. Anything else — a fraction, a stray trailing character,
 * hexadecimal or exponent notation, surrounding spaces, or a number out of
 * range — is reported rather than silently ignored: the warning names the
 * offending value and the port that will be used instead, so a mistyped
 * setting is obvious in the very first line of output.
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

  // Environment variables are always text, so the value has to be read as a
  // number — but only once the whole of it has been confirmed to be a decimal
  // whole number. Checking first and converting second is the point: it is what
  // makes `3000abc`, `1.5`, `1e3` and `0x10` mistakes to report rather than
  // prefixes to salvage.
  if (DECIMAL_WHOLE_NUMBER.test(raw)) {
    const parsed = Number(raw);

    // Zero is accepted deliberately and means "let the operating system pick a
    // free port", which is how a test binds without colliding with a server
    // that is already running. Only the upper bound needs testing here, since
    // a string of digits can be neither negative nor fractional; the
    // safe-integer check states the remaining invariant, that a run of digits
    // too long to be represented exactly is not a port either.
    if (Number.isSafeInteger(parsed) && parsed <= MAX_PORT) {
      return parsed;
    }
  }

  // The offending value is serialised rather than dropped in as-is. An
  // environment variable can hold newlines and terminal escape sequences, and
  // pasting those straight into the output would let a mistyped — or
  // deliberately crafted — setting forge log lines of its own. `JSON.stringify`
  // escapes them and supplies the surrounding double quotes this message has
  // always shown, so an ordinary value such as `not-a-number` still reads
  // exactly as the README documents it.
  console.warn(`Invalid PORT ${JSON.stringify(raw)}; falling back to ${DEFAULT_PORT}.`);
  return DEFAULT_PORT;
}

const port = resolvePort(process.env.PORT);
const server = createServer();

/**
 * Shuts the process down in response to a termination signal.
 *
 * Two lines are printed and nothing else: one when the signal arrives, and one
 * when the server has finished closing, which is also the moment the process
 * exits with status `0`.
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
// assembled by hand — which is why the port it names is read back from the
// socket rather than repeated from the request. The two differ whenever the
// request was `0`: that asks the operating system to choose a free port, and
// only the bound address knows which one it chose.
server.listen(port, () => {
  const address = server.address();
  const boundPort = address === null || typeof address === 'string' ? port : address.port;

  console.log(timestamped(`Listening on http://localhost:${boundPort}/hello`));
});
