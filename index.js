'use strict';

/**
 * index.js — the process entry point. It binds the HTTP contract to the
 * operating system and owns the four concerns that are not the protocol's:
 * which port to listen on, how readiness is announced, what a failed bind
 * reports, and how the process stops cleanly. What the server actually *says*
 * lives in `src/server.js`.
 *
 * @module index
 */

// `HELLO_PATH` is imported rather than retyped: the route is declared once, in
// the module that owns the contract, so the URL printed below cannot drift from
// the path the server actually answers.
const { createServer, HELLO_PATH } = require('./src/server');

const DEFAULT_PORT = 3000;

const MAX_PORT = 65535;

/**
 * Matches a decimal whole number from end to end. The whole string has to match,
 * because a parser that stops at the first character it cannot use would turn
 * `3000abc` into 3000, and `1.5`, `1e3` and `0x10` into ports nobody asked for.
 */
const DECIMAL_WHOLE_NUMBER = /^\d+$/;

/**
 * The characters a terminal or log viewer may act on rather than show, and which
 * `JSON.stringify` leaves exactly as it found them: `U+007F` and the C1 controls
 * `U+0080`-`U+009F`, one of which, `U+0085`, is a line break in its own right;
 * the Unicode line and paragraph separators `U+2028` and `U+2029`; and the
 * bidirectional formatting characters, which can reverse the reading order of
 * everything around them. {@link quoteForLog} rewrites each as a visible
 * `\uXXXX` escape instead.
 */
const DISPLAY_CONTROL_CHARACTERS =
  /[\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g;

/**
 * Renders an environment value for the warning below: quoted, on one line, and
 * showing exactly what was supplied. `JSON.stringify` does most of the work — the
 * surrounding quotes, and every control character below `U+0020` — and the
 * replacement step closes the gap described on
 * {@link DISPLAY_CONTROL_CHARACTERS}. An ordinary value passes through untouched,
 * so `not-a-number` still reads `"not-a-number"`.
 *
 * @param {string} raw The value exactly as the environment supplied it.
 * @returns {string} A quoted, single-line rendering safe to print.
 */
function quoteForLog(raw) {
  return JSON.stringify(raw).replace(
    DISPLAY_CONTROL_CHARACTERS,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}

function timestamped(message) {
  return `[${new Date().toISOString()}] ${message}`;
}

/**
 * Decides which port to listen on: the `PORT` environment variable when the
 * whole of it is a decimal whole number from 0 to {@link MAX_PORT}, otherwise
 * {@link DEFAULT_PORT}. A value that cannot be used is reported rather than
 * silently ignored, naming both the offending value and the port used instead.
 *
 * @param {string|undefined} raw The raw `PORT` value exactly as the environment
 *   supplied it, or `undefined` when it is not set.
 * @returns {number} The supplied port when it is usable, otherwise
 *   {@link DEFAULT_PORT}.
 */
function resolvePort(raw) {
  // An absent or empty value is the ordinary case, so it falls back silently.
  if (raw === undefined || raw === '') {
    return DEFAULT_PORT;
  }

  if (DECIMAL_WHOLE_NUMBER.test(raw)) {
    const parsed = Number(raw);

    // Zero is accepted deliberately and means "let the operating system pick a
    // free port". A run of digits can be neither negative nor fractional, so
    // only the upper bound and exact representability remain to be checked.
    if (Number.isSafeInteger(parsed) && parsed <= MAX_PORT) {
      return parsed;
    }
  }

  // The offending value is escaped rather than interpolated as-is: an environment
  // variable can hold newlines, terminal escape sequences, Unicode line
  // separators and direction overrides that would otherwise forge log lines of
  // their own or rewrite the order of this one. {@link quoteForLog} escapes them
  // and supplies the required quotes.
  console.warn(`Invalid PORT ${quoteForLog(raw)}; falling back to ${DEFAULT_PORT}.`);
  return DEFAULT_PORT;
}

const port = resolvePort(process.env.PORT);
const server = createServer();

/**
 * Shuts the process down in response to a termination signal: one line on
 * receipt, and — for a server that was actually listening — one more when it has
 * finished closing, which is also the moment the process ends with status `0`.
 * Nothing claims a clean close otherwise, because a signal can arrive while the
 * bind is still in flight or after it has failed, and announcing a successful
 * close for a server that never listened would contradict the failure the
 * `error` listener is about to report.
 *
 * It runs once. Closing takes as long as the requests still in flight take to
 * finish, and a reader watching that wait is quite likely to press Ctrl+C again;
 * the first signal claims the job and both handlers stand down, which hands the
 * next signal back to the runtime's default action — an immediate stop, almost
 * certainly what a second Ctrl+C was asking for.
 *
 * @param {string} signal The signal that arrived — `SIGINT` or `SIGTERM`.
 * @returns {void}
 */
function shutdown(signal) {
  // Retiring both handlers, before anything else happens, is what makes this run
  // once: with no listener left, a later signal is the runtime's business again.
  process.removeListener('SIGINT', shutdown);
  process.removeListener('SIGTERM', shutdown);

  console.log(timestamped(`Received ${signal}, closing server.`));

  // `close` is what makes this graceful: it stops the server accepting new
  // connections and calls back only once the requests already in flight have
  // finished, which is why the last word lives inside the callback.
  server.close((error) => {
    // An error here means one thing only: the server was not listening, so there
    // was nothing to close. That happens when a signal arrives while the bind is
    // still in flight, or after it has already failed — and in that case there is
    // no clean close to announce and no success to claim. The exit status is left
    // to the `error` listener below, which owns the failure and reports it.
    if (error) {
      return;
    }

    console.log(timestamped('Server closed.'));

    // The status is set and the process left to end by itself, which it does as
    // soon as the event loop is empty — and the closed server was the last thing
    // holding it open. Forcing the exit here would be a moment quicker and would
    // risk throwing away the two lines above, because a write to a pipe is
    // asynchronous and whatever is still queued never arrives.
    process.exitCode = 0;
  });
}

// Registered before `listen`, because the failures it explains happen during the
// bind attempt itself. Without it a busy port arrives as an unhandled `error`
// event and an opaque stack trace.
server.on('error', (error) => {
  let message;

  if (error.code === 'EADDRINUSE') {
    message = `Port ${port} is already in use.`;
  } else if (error.code === 'EACCES') {
    message = `Insufficient permissions to bind to port ${port}.`;
  } else {
    message = error.message;
  }

  console.error(message);

  // The status is set rather than forced, so the process ends by itself once the
  // event loop is empty and the message above is certain to have been written: a
  // forced exit can discard output still queued on a pipe, and a startup failure
  // that explains nothing is the very thing this listener exists to prevent.
  process.exitCode = 1;

  // Releasing the server covers the other way this listener can be reached — an
  // error raised while it was already listening — where the listening socket
  // would otherwise keep the process alive with the failure unresolved.
  server.close();
});

// One handler for both signals, because the wanted outcome is identical: SIGINT
// is the interactive Ctrl+C, SIGTERM is what process managers send. Both
// registrations are retired inside it, so this pair is armed for exactly one
// shutdown and a later signal falls through to the runtime's default action.
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// The single line of output on a healthy start. It carries the full endpoint URL
// so it can be followed straight from the terminal, and the port it names is read
// back from the bound socket — a requested `0` asks the operating system to
// choose, and only the bound address knows what it chose.
server.listen(port, () => {
  const address = server.address();
  const boundPort = address === null || typeof address === 'string' ? port : address.port;

  console.log(timestamped(`Listening on http://localhost:${boundPort}${HELLO_PATH}`));
});
