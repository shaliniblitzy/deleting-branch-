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
 * Resolves the path a request is asking for. The request target is handed to the
 * `URL` constructor, resolved against the request's own `Host` header, and the
 * `pathname` it hands back is what gets matched — which is what makes a query
 * string irrelevant to routing, so `GET /hello?a=1` reaches the endpoint.
 *
 * The constructor also canonicalises what it parses, as the URL standard asks:
 * `.` and `..` segments are resolved away and an absolute target such as
 * `GET http://host/hello` yields the path inside it. Those are alternative
 * spellings of the one endpoint rather than routes of their own — the same thing
 * trailing-slash normalisation does for `/hello/`.
 *
 * A target the constructor will not parse falls back to reading the raw target
 * directly: everything before the first `?`. That branch is reachable — a
 * malformed `Host` header is enough to make the constructor throw — and it is
 * what keeps this function total: every request resolves to some path, and a
 * path that is not {@link HELLO_PATH} answers 404 like any other.
 *
 * @param {http.IncomingMessage} req The inbound request.
 * @returns {string} The normalised path to match against {@link HELLO_PATH}.
 */
function resolvePathname(req) {
  const target = typeof req.url === 'string' ? req.url : '';

  try {
    // The `Host` header supplies only the base the target is resolved against.
    // The pathname read back never depends on its value, so a client cannot
    // steer routing by rewriting the header; a missing one is stood in for.
    const { pathname } = new URL(target, `http://${req.headers.host || 'localhost'}`);

    return normalisePathname(pathname);
  } catch {
    const queryStart = target.indexOf('?');

    return normalisePathname(queryStart === -1 ? target : target.slice(0, queryStart));
  }
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
 * Creates a new, fully wired but **unbound** HTTP server: a factory rather than
 * a singleton, so nothing is bound until the caller invokes `listen`. That keeps
 * this module import-safe and lets a test bind an ephemeral port while a
 * development instance holds port 3000.
 *
 * @returns {http.Server} A server that answers `/hello`, not yet listening.
 */
function createServer() {
  return http.createServer(handleRequest);
}

module.exports = {
  createServer,
  HELLO_PATH,
  HELLO_BODY,
  ALLOWED_METHODS,
};
