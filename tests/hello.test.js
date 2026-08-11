'use strict';

/**
 * tests/hello.test.js — the executable statement of this project's one promise.
 *
 * The requirement behind this project is a single sentence: one endpoint,
 * `/hello`, that returns a fixed greeting to the calling HTTP client. This file
 * turns that sentence into something a machine can check, so the claim is
 * proven on demand instead of taken on trust.
 *
 * It carries three automated acceptance cases, and only these three:
 *
 *   1. `GET /hello` answers 200, with the exact payload, as plain text;
 *   2. `GET /` — the root path — answers 404, evidence that the endpoint is not
 *      simply everything;
 *   3. `POST /hello` answers 405 and names the methods that *are* allowed.
 *
 * Three is the whole suite, deliberately, and it is narrower than the whole
 * behaviour of `src/server.js`. It says nothing about `HEAD`, about the
 * tolerance for a trailing slash or a query string, about the rejection of
 * alias spellings such as `/x/../hello`, about the exact `Content-Length` or
 * the two protective headers, and nothing at all about the entry point's port
 * handling or its shutdown. Those are checked by hand against the transcripts
 * in the README, which is where the project chose to spend that verification
 * rather than growing this file. What the suite does cover, it covers end to
 * end: a real server, a real socket, a real client.
 *
 * The second case deserves one more word, because its name is easy to read as
 * more than it is. It asks about a single path, `/`, which makes it an example
 * rather than a proof. The wider rule — that `/hello` is the only endpoint and
 * that every other pathname answers 404 — is held by the routing in
 * `src/server.js`, where one equality settles every path there could ever be,
 * and by the failure-case commands in the README. A second route added beside
 * `/hello` would leave this case green, so that rule is established by reading
 * the equality and running those commands, not by this file.
 *
 * Two design choices are worth understanding before reading on, because both
 * exist to make the suite trustworthy rather than merely green:
 *
 * - **Nothing contractual is re-typed here.** The path, the payload and the
 *   method list are imported from `src/server.js`, the very module under test,
 *   so there is one spelling of each in the project instead of two that can
 *   fall out of step. Be clear about what that does and does not buy. It
 *   removes the duplication, so a rename cannot leave this file asserting
 *   against a value the server no longer uses. It is *not* independent proof
 *   that the values are the right ones: a server that returned the wrong
 *   greeting would still satisfy a test that asks it for its own greeting.
 *   What pins those two literals is the requirement itself — the endpoint
 *   `/hello` returning `Hello world` — checked by reading the constants in
 *   `src/server.js` and by the `curl` transcript in the README, which quotes
 *   the bytes on the wire rather than importing them.
 *
 * - **The port is chosen by the operating system.** Binding port `0` asks for
 *   any free port, so the suite runs happily alongside a development instance
 *   holding the project's usual port, and can never fail merely because
 *   something else got there first.
 *
 * Everything used here ships inside Node.js — the test runner, the assertions
 * and the HTTP client alike. The project declares no dependencies, so this
 * suite runs on a fresh clone without installing anything first.
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
 * The deadline given to every awaited step in this file — each hook and each
 * test.
 *
 * A suite needs an answer for the server that accepts a connection and then
 * says nothing, because that is the one regression it cannot otherwise report.
 * Left to itself, an awaited `fetch` waits on the runtime's own network
 * defaults, which are measured in minutes, and the run becomes a suite that
 * hangs rather than a suite that fails — the worst of both outcomes, since it
 * reports nothing and blocks whatever is waiting on it. A deadline turns that
 * silence into a named failure at a known moment.
 *
 * Five seconds is chosen to be unmistakable in both directions: these requests
 * travel over loopback and finish in single-digit milliseconds, so no healthy
 * run comes close to it even on a loaded machine, and it is far shorter than
 * the wait it replaces.
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
 *
 * That covers a bind that succeeds and a bind that fails; the hook's own
 * deadline covers the third possibility, a bind that does neither. Without it
 * the promise above would simply never settle, and the file would stall with
 * nothing reported.
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
}, { timeout: OPERATION_TIMEOUT_MS });

/**
 * Releases the socket once the file is done.
 *
 * A listening server keeps the event loop alive, so skipping this would leave
 * the runner's child process running after the last assertion — turning a
 * passing suite into a hang. `close` is asynchronous, reporting back only once
 * every connection has finished, so the hook waits for it and surfaces any
 * failure instead of discarding it.
 *
 * "Once every connection has finished" is also the sharp edge of `close`, and
 * the reason this hook does two things rather than one. A regression that left
 * a request open would keep a connection open with it, and the wait would then
 * have no end: the hook would hold, and the child process would outlive the
 * run holding a socket nobody is reading. Any connection still open at this
 * point is therefore taken down deliberately, and the hook carries a deadline
 * of its own so that a close which somehow still fails to complete is reported
 * rather than waited on.
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

    // Asked for after `close`, never instead of it: `close` is what stops new
    // connections being accepted and what reports completion, and this is what
    // makes that completion prompt. By this point every request the suite made
    // has been read to the end, so the only sockets left are idle ones the
    // client keeps for reuse — or, if something has gone wrong, the very
    // connection that would otherwise hold the run open for good.
    server.closeAllConnections();
  });
}, { timeout: OPERATION_TIMEOUT_MS });

test(
  `GET ${HELLO_PATH} responds 200 with the exact payload as plain text`,
  { timeout: OPERATION_TIMEOUT_MS },
  async (t) => {
    // `t.signal` is aborted the moment this test's deadline expires, and
    // handing it to `fetch` is what makes the deadline mean something: a
    // request to a server that never answers is dropped there and then, rather
    // than left running behind a test already reported as failed.
    const response = await fetch(`${baseUrl}${HELLO_PATH}`, {
      signal: t.signal,
    });

    // Read the body before asserting anything, so the connection is never left
    // half-read no matter which assertion below decides to fail.
    const body = await response.text();

    assert.strictEqual(response.status, 200);

    // The decoded body, character for character, against the very constant the
    // server sends: the user's requirement in its entirety. `text()` hands back
    // a decoded string rather than the bytes it arrived as, so the byte-level
    // facts — eleven bytes, no trailing newline — belong to the `od -c`
    // transcript in the README, which reads the wire itself.
    assert.strictEqual(body, HELLO_BODY);

    // Matched as a prefix rather than compared whole: the real header carries a
    // charset parameter, and the media type is what this assertion is about.
    assert.match(response.headers.get('content-type'), /^text\/plain/);
  },
);

test('GET / responds 404', { timeout: OPERATION_TIMEOUT_MS }, async (t) => {
  const response = await fetch(`${baseUrl}/`, { signal: t.signal });
  await response.text();

  // One path, sampled deliberately: the root is the closest neighbour of the
  // only route, which makes it the sharpest single example available — and an
  // example is all it is. That every *other* path answers the same way follows
  // from the routing in `src/server.js`, which decides it with one equality,
  // and from the failure-case commands in the README. This case is named for
  // the request it actually makes so that it claims no more than it checks.
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

    // `Allow` is mandatory on a 405, and answering with a 404 instead would
    // wrongly claim the resource does not exist. The expected value is derived
    // from the same list the server routes on, so the advertisement and the
    // behaviour cannot disagree. Header lookups are case-insensitive.
    assert.strictEqual(
      response.headers.get('allow'),
      ALLOWED_METHODS.join(', '),
    );
  },
);
