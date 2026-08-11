'use strict';

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const {
  createServer,
  HELLO_PATH,
  HELLO_BODY,
  ALLOWED_METHODS,
} = require('../src/server');

/**
 * The interface the suite binds to, and the host it addresses requests to. The
 * literal IPv4 address is used rather than the name `localhost`, which resolves
 * to both `127.0.0.1` and `::1` on a dual-stack host and could send a client to
 * an address this server is not listening on. Staying on loopback also keeps the
 * socket unreachable from off the machine.
 *
 * @type {string}
 */
const LOOPBACK_HOST = '127.0.0.1';

/**
 * The deadline given to every awaited step — each hook and each test. Without
 * one, a server that accepts a connection and then says nothing turns the run
 * into a hang that reports nothing, rather than a failure that names itself.
 * Five seconds bounds a stalled operation while leaving ample time for normal
 * loopback work.
 *
 * @type {number}
 */
const OPERATION_TIMEOUT_MS = 5000;

/**
 * The server under test: created and bound in `before`, released in `after`.
 *
 * @type {import('node:http').Server | undefined}
 */
let server;

/**
 * The origin every request in this file is sent to, for example
 * `http://127.0.0.1:45213`: `undefined` until `before` has a granted port to
 * assemble it from.
 *
 * @type {string | undefined}
 */
let baseUrl;

/**
 * Starts one server for the whole file. Port `0` asks for any free port, which
 * is what keeps the suite isolated from anything else running on the machine, so
 * the port granted has to be read back off the bound socket. `listen` reports
 * success through a callback and failure through an `error` event, so both are
 * funnelled into a single promise; the hook's own deadline covers a bind that
 * does neither.
 */
before(async () => {
  server = createServer();

  await new Promise((resolve, reject) => {
    server.once('error', reject);

    server.listen(0, LOOPBACK_HOST, () => {
      // Bound, so the one-shot guard is retired rather than left in place where
      // it could only reject an already-resolved promise.
      server.removeListener('error', reject);
      resolve();
    });
  });

  baseUrl = `http://${LOOPBACK_HOST}:${server.address().port}`;
}, { timeout: OPERATION_TIMEOUT_MS });

/**
 * Releases the socket once the file is done; a listening server keeps the
 * runner's child process alive and would turn a passing suite into a hang.
 * `close` reports back only once every connection has finished, which is also
 * its sharp edge — so any connection still open at this point is taken down
 * deliberately, and the hook carries a deadline of its own.
 */
after(async () => {
  // Nothing to release if `before` never reached a bound socket, and closing a
  // server that never listened would raise a second error masking the first.
  if (!server || !server.listening) {
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));

    // Asked for after `close`, never instead of it: `close` stops new
    // connections and reports completion, this makes that completion prompt.
    server.closeAllConnections();
  });
}, { timeout: OPERATION_TIMEOUT_MS });

test(
  `GET ${HELLO_PATH} responds 200 with the exact payload as plain text`,
  { timeout: OPERATION_TIMEOUT_MS },
  async (t) => {
    // `t.signal` aborts when this test's deadline expires, which is what makes
    // the deadline mean something for the request itself.
    const response = await fetch(`${baseUrl}${HELLO_PATH}`, {
      signal: t.signal,
    });

    // Read before asserting, so the connection is never left half-read whichever
    // assertion below fails.
    const body = await response.text();

    assert.strictEqual(response.status, 200);

    // The decoded body against the very constant the server sends. `text()`
    // returns a decoded string, so the byte-level facts — eleven bytes, no
    // trailing newline — belong to the README's `od -c` transcript.
    assert.strictEqual(body, HELLO_BODY);

    // A prefix match: the real header carries a charset parameter, and the media
    // type is what this assertion is about.
    assert.match(response.headers.get('content-type'), /^text\/plain/);
  },
);

test('GET / responds 404', { timeout: OPERATION_TIMEOUT_MS }, async (t) => {
  const response = await fetch(`${baseUrl}/`, { signal: t.signal });
  await response.text();

  assert.strictEqual(response.status, 404);
});

test(
  `a disallowed method on ${HELLO_PATH} responds 405 and advertises what is allowed`,
  { timeout: OPERATION_TIMEOUT_MS },
  async (t) => {
    const response = await fetch(`${baseUrl}${HELLO_PATH}`, {
      method: 'POST',
      signal: t.signal,
    });
    await response.text();

    assert.strictEqual(response.status, 405);

    // `Allow` is mandatory on a 405. The expected value is derived from the same
    // list the server routes on, so advertisement and behaviour cannot disagree.
    assert.strictEqual(
      response.headers.get('allow'),
      ALLOWED_METHODS.join(', '),
    );
  },
);
