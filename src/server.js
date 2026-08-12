'use strict';

/**
 * src/server.js — the HTTP contract for the `/hello` endpoint: the one route it
 * recognises, the exact bytes it returns, and the headers that describe them.
 * Ports, logging and signals belong to the entry point, `index.js`.
 *
 * Requiring this module is inert — nothing is bound until a caller invokes
 * {@link createServer} and listens — which is what lets the test suite bind an
 * ephemeral port while a development instance keeps port 3000.
 *
 * @module src/server
 */

const http = require('node:http');

/**
 * The only path this server recognises. A request target is matched against it
 * with its query string removed and any trailing slashes normalised away.
 */
const HELLO_PATH = '/hello';

/**
 * The payload, exactly as specified: eleven bytes, lowercase `w`, no comma, no
 * exclamation mark, no trailing newline. The success response computes its
 * `Content-Length` from this value, so header and body cannot disagree.
 */
const HELLO_BODY = 'Hello world';

/**
 * The methods accepted on {@link HELLO_PATH}. `HEAD` is included because HTTP
 * expects a server answering `GET` for a resource to answer `HEAD` for it too.
 * Frozen so the contract cannot be widened at runtime.
 */
const ALLOWED_METHODS = Object.freeze(['GET', 'HEAD']);

const ALLOW_HEADER_VALUE = ALLOWED_METHODS.join(', ');

const NOT_FOUND_BODY = 'Not Found';

const METHOD_NOT_ALLOWED_BODY = 'Method Not Allowed';

const CONTENT_TYPE_TEXT_PLAIN = 'text/plain; charset=utf-8';

/**
 * Builds the header set shared by all three responses. `Content-Length` is
 * measured from the body about to be written; `nosniff` stops a client
 * re-interpreting plain text as another media type, and `no-store` keeps a
 * tutorial response out of caches. A fresh object each call lets the 405 writer
 * add `Allow` without mutating shared state.
 *
 * @param {string} body The exact body that will be sent with these headers.
 * @returns {{[header: string]: string | number}} Headers ready for `writeHead`.
 */
function buildResponseHeaders(body) {
  return {
    'Content-Type': CONTENT_TYPE_TEXT_PLAIN,
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  };
}

/**
 * Removes trailing slashes so `/hello`, `/hello/` and `/hello//` all describe the
 * same resource. `/` is left untouched, being a distinct path that must go on
 * returning 404, and nothing else is rewritten — which is what stops this
 * turning into a router.
 *
 * @param {string} pathname The path taken from the request target.
 * @returns {string} The root path unchanged, otherwise the path with any
 *   trailing slashes removed.
 */
function normalisePathname(pathname) {
  let normalised = pathname;

  while (normalised.length > 1 && normalised.endsWith('/')) {
    normalised = normalised.slice(0, -1);
  }

  return normalised;
}

/**
 * Resolves the path a request is asking for: the request target exactly as the
 * client sent it, with any query string removed. That is what makes a query
 * string irrelevant to routing, so `GET /hello?a=1` reaches the endpoint.
 *
 * What the target is deliberately *not* put through is URL canonicalisation. The
 * `URL` constructor rewrites what it parses, as the URL standard asks: it
 * resolves `.` and `..` segments — including their percent-encoded spellings
 * `%2e` and `%2e%2e` — drops a fragment, and reduces an absolute target such as
 * `GET http://host/hello` to the path inside it. Routing on the result would
 * hand this one endpoint a whole family of extra request targets: `/x/../hello`,
 * `/./hello`, `/hello/.`, `/hello/%2e` and the rest would each answer 200. One
 * endpoint means one request target, so the comparison is made against what the
 * client actually sent, and every other spelling answers 404 like any other
 * unknown path. Trailing slashes are the single documented exception, and
 * {@link normalisePathname} is where that exception lives.
 *
 * A target that is not origin-form needs no branch of its own: absolute-form
 * (`http://host/hello`), authority-form (`host:443`, what a `CONNECT` carries)
 * and the asterisk-form `*` are none of them equal to {@link HELLO_PATH}, so
 * they answer 404 by the same rule. Reading the raw target cannot throw either,
 * which is what keeps this function total — every request resolves to some path,
 * and every path that is not the route answers 404.
 *
 * @param {http.IncomingMessage} req The inbound request.
 * @returns {string} The normalised path to match against {@link HELLO_PATH}.
 */
function resolvePathname(req) {
  const target = typeof req.url === 'string' ? req.url : '';
  const queryStart = target.indexOf('?');

  return normalisePathname(queryStart === -1 ? target : target.slice(0, queryStart));
}

/**
 * Writes the success response: `200 OK` carrying the payload. A `HEAD` request
 * receives the same status line and headers — `Content-Length: 11` included —
 * but no body, which is what HTTP specifies.
 *
 * @param {http.IncomingMessage} req The inbound request; its method decides
 *   whether a body is written.
 * @param {http.ServerResponse} res The response to write.
 * @returns {void}
 */
function sendHello(req, res) {
  res.writeHead(200, buildResponseHeaders(HELLO_BODY));

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  res.end(HELLO_BODY);
}

function sendNotFound(res) {
  res.writeHead(404, buildResponseHeaders(NOT_FOUND_BODY));
  res.end(NOT_FOUND_BODY);
}

/**
 * Writes `405 Method Not Allowed` for the right path with the wrong method. The
 * `Allow` header is mandatory on a 405, and a 404 here would wrongly claim the
 * resource does not exist.
 *
 * @param {http.ServerResponse} res The response to write.
 * @returns {void}
 */
function sendMethodNotAllowed(res) {
  const headers = buildResponseHeaders(METHOD_NOT_ALLOWED_BODY);
  headers.Allow = ALLOW_HEADER_VALUE;

  res.writeHead(405, headers);
  res.end(METHOD_NOT_ALLOWED_BODY);
}

function handleRequest(req, res) {
  const pathname = resolvePathname(req);

  if (pathname !== HELLO_PATH) {
    sendNotFound(res);
    return;
  }

  if (!ALLOWED_METHODS.includes(req.method)) {
    sendMethodNotAllowed(res);
    return;
  }

  sendHello(req, res);
}

/**
 * Writes a complete HTTP/1.1 response message as text. This exists for the one
 * request the runtime does not hand to a listener with an `http.ServerResponse`
 * to write through — a `CONNECT`, which arrives with a raw socket instead — so
 * the status line, the headers and the blank line before the body are assembled
 * here by hand.
 *
 * The header set is the one every other response carries, plus the two the
 * runtime would otherwise have added itself: `Date`, which an origin server owes
 * every 4xx response, and `Connection: close`, because the socket is closed as
 * soon as this is written and a client that asked for a tunnel must not sit
 * waiting for one.
 *
 * @param {number} statusCode The status code to send.
 * @param {string} reasonPhrase The reason phrase belonging to that status code.
 * @param {string} body The exact body to send.
 * @param {{[header: string]: string}} [extraHeaders] Any headers beyond the
 *   shared set — the `Allow` header on a 405, and nothing else.
 * @returns {string} A complete response message, ready to write to a socket.
 */
function serialiseResponse(statusCode, reasonPhrase, body, extraHeaders = {}) {
  const headers = {
    ...buildResponseHeaders(body),
    ...extraHeaders,
    Date: new Date().toUTCString(),
    Connection: 'close',
  };

  const headerLines = Object.entries(headers)
    .map(([name, value]) => `${name}: ${value}`)
    .join('\r\n');

  return `HTTP/1.1 ${statusCode} ${reasonPhrase}\r\n${headerLines}\r\n\r\n${body}`;
}

/**
 * Answers a `CONNECT` request. The runtime keeps `CONNECT` away from the request
 * listener — it belongs to the server's own `connect` event, because the method
 * asks for a tunnel rather than for a resource — and a server that leaves that
 * event unhandled destroys the connection without sending a single byte. Silence
 * is not one of the answers this server is allowed to give, so the same two rules
 * that apply to any other request are applied here over the raw socket: a
 * `CONNECT` is not one of {@link ALLOWED_METHODS}, so the route answers `405`
 * with `Allow`, and every other target answers `404`.
 *
 * No tunnel is opened either way. This server proxies nothing, and the socket
 * carries the response and then closes.
 *
 * (An `Upgrade` request needs no equivalent: the runtime passes it to the
 * ordinary request listener when nothing is listening for `upgrade`, so it is
 * already answered by the three rules above.)
 *
 * @param {http.IncomingMessage} req The inbound `CONNECT` request.
 * @param {import('node:net').Socket} socket The connection it arrived on.
 * @returns {void}
 */
function handleConnect(req, socket) {
  // The runtime removes its own socket listeners before emitting this event, so
  // a socket error — a client that vanishes mid-write, most likely — would be
  // unhandled and would end the process. There is nothing to report, because the
  // response below is the last thing this socket carries, so it is released.
  socket.on('error', () => {
    socket.destroy();
  });

  if (resolvePathname(req) !== HELLO_PATH) {
    socket.end(serialiseResponse(404, 'Not Found', NOT_FOUND_BODY));
    return;
  }

  socket.end(
    serialiseResponse(405, 'Method Not Allowed', METHOD_NOT_ALLOWED_BODY, {
      Allow: ALLOW_HEADER_VALUE,
    }),
  );
}

/**
 * Creates a new, fully wired but **unbound** HTTP server: a factory rather than
 * a singleton, so nothing is bound until the caller invokes `listen`. That keeps
 * this module import-safe and lets a test bind an ephemeral port while a
 * development instance holds port 3000.
 *
 * Both listeners are registered here, on every server the factory hands back, so
 * that each one answers every request it accepts: the request listener for the
 * ordinary methods, and {@link handleConnect} for the `CONNECT` the runtime
 * routes elsewhere.
 *
 * @returns {http.Server} A server that answers `/hello`, not yet listening.
 */
function createServer() {
  const server = http.createServer(handleRequest);

  server.on('connect', handleConnect);

  return server;
}

module.exports = {
  createServer,
  HELLO_PATH,
  HELLO_BODY,
  ALLOWED_METHODS,
};
