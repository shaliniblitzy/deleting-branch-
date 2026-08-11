'use strict';

/**
 * tests/hello.test.js — the executable statement of this project's one promise.
 *
 * The requirement behind this project is a single sentence: one endpoint,
 * `/hello`, that returns a fixed greeting to the calling HTTP client. This file
 * turns that sentence into something a machine can check, so the claim is
 * proven on demand instead of taken on trust.
 *
 * Three cases cover the whole contract that `src/server.js` implements:
 *
 *   1. the endpoint answers with the exact payload, as plain text;
 *   2. any other path is a 404 — evidence that exactly one endpoint exists;
 *   3. a disallowed method on the endpoint is a 405 that names the methods
 *      which *are* allowed.
 *
 * Two design choices are worth understanding before reading on, because both
 * exist to make the suite trustworthy rather than merely green:
 *
 * - **Nothing contractual is re-typed here.** The path, the payload and the
 *   method list are imported from `src/server.js`, the very module under test,
 *   so the test and the implementation read from one source. Spelling the
 *   route out again in this file would let the two drift apart silently: an
 *   implementation that moved the route would go on passing a test that still
 *   asked for the old one, and the suite would be green while the product was
 *   broken.
 *
 * - **The port is chosen by the operating system.** Binding port `0` asks for
 *   any free port, so the suite runs happily alongside a development instance
 *   holding the project's usual port, and can never fail merely because
 *   something else got there first.
 *
 * Everything used here ships inside Node.js — the test runner, the assertions
 * and the HTTP client alike. The project has no dependencies to install, so
 * this suite runs on a fresh clone with nothing fetched.
 *
 * Run it with `npm test`, or directly with `node --test`.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const {
  createServer,
  HELLO_PATH,
  HELLO_BODY,
  ALLOWED_METHODS,
} = require('../src/server');

/**
 * The interface the suite binds to, and the host the requests are addressed to.
 *
 * IPv4 loopback is named explicitly, and by literal address rather than by the
 * name `localhost`, because that name resolves to *both* `127.0.0.1` and `::1`
 * on a dual-stack host. A client handed `localhost` may try the IPv6 address
 * first and be refused by a server listening only on IPv4 — an intermittent
 * failure that has nothing to do with the code under test. Using the literal
 * address on both sides removes the ambiguity outright, and keeping the socket
 * on loopback means the suite never opens a port reachable from off the
 * machine.
 *
 * @type {string}
 */
const LOOPBACK_HOST = '127.0.0.1';

/**
 * The server under test: created and bound in `before`, released in `after`.
 *
 * @type {import('node:http').Server | undefined}
 */
let server;

/**
 * The origin every request in this file is sent to, for example
 * `http://127.0.0.1:45213`. Assembled in `before`, once the operating system
 * has told us which port it actually granted.
 *
 * @type {string}
 */
let baseUrl;

/**
 * Starts one server for the whole file.
 *
 * `createServer()` hands back a server that is fully wired but not listening —
 * requiring that module binds nothing — so putting it on a socket is this
 * hook's job. Port `0` means "any free port", which is what keeps the suite
 * isolated from anything else running on the machine; the port actually
 * granted is then read back off the bound socket, since it cannot be known in
 * advance.
 *
 * `listen` reports success through a callback and failure through an `error`
 * event, so both are funnelled into a single promise. Without that, an awaited
 * hook could return before the socket was ready, and a bind failure would
 * surface later as a hang or a puzzling connection refusal instead of a clear
 * failure right here.
 */
before(async () => {
  server = createServer();

  await new Promise((resolve, reject) => {
    // Fails the hook loudly if the socket cannot be bound at all.
    server.once('error', reject);

    server.listen(0, LOOPBACK_HOST, () => {
      // Bound successfully, so this promise's outcome is settled. The one-shot
      // guard above is retired rather than left in place, where it could only
      // swallow a later error by rejecting an already-resolved promise.
      server.removeListener('error', reject);
      resolve();
    });
  });

  baseUrl = `http://${LOOPBACK_HOST}:${server.address().port}`;
});

/**
 * Releases the socket once the file is done.
 *
 * A listening server keeps the event loop alive, so skipping this would leave
 * the runner's child process running after the last assertion — turning a
 * passing suite into a hang. `close` is asynchronous, reporting back only once
 * every connection has finished, so the hook waits for it and surfaces any
 * failure instead of discarding it.
 */
after(async () => {
  // If `before` never reached a bound socket there is nothing to release, and
  // closing a server that was never listening would raise a second error that
  // masks the first — the one that actually explains the failure.
  if (!server || !server.listening) {
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test(`GET ${HELLO_PATH} responds 200 with the exact payload as plain text`, async () => {
  const response = await fetch(`${baseUrl}${HELLO_PATH}`);

  // Read the body before asserting anything, so the connection is never left
  // half-read no matter which assertion below decides to fail.
  const body = await response.text();

  assert.strictEqual(response.status, 200);

  // Byte for byte against the very constant the server sends. This is the
  // user's requirement in its entirety.
  assert.strictEqual(body, HELLO_BODY);

  // Matched as a prefix rather than compared whole: the real header carries a
  // charset parameter, and the media type is what this assertion is about.
  assert.match(response.headers.get('content-type'), /^text\/plain/);
});

test('a request for any other path responds 404', async () => {
  const response = await fetch(`${baseUrl}/`);
  await response.text();

  // The root path is the closest neighbour of the one supported route, which
  // makes it the sharpest available evidence that no second endpoint exists.
  assert.strictEqual(response.status, 404);
});

test(`a disallowed method on ${HELLO_PATH} responds 405 and advertises what is allowed`, async () => {
  const response = await fetch(`${baseUrl}${HELLO_PATH}`, { method: 'POST' });
  await response.text();

  assert.strictEqual(response.status, 405);

  // `Allow` is mandatory on a 405, and answering with a 404 instead would
  // wrongly claim the resource does not exist. The expected value is derived
  // from the same list the server routes on, so the advertisement and the
  // behaviour cannot disagree. Header lookups are case-insensitive.
  assert.strictEqual(response.headers.get('allow'), ALLOWED_METHODS.join(', '));
});
