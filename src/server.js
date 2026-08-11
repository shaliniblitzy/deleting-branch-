'use strict';

/**
 * src/server.js — the HTTP contract for the `/hello` endpoint.
 *
 * This module owns *what the server says*: the one route it recognises, the
 * exact bytes it returns, and the headers that describe them. It owns nothing
 * about *how the process runs* — choosing a port, binding a socket, logging a
 * ready message and handling termination signals all belong to the entry
 * point, `index.js`.
 *
 * Requiring this module is deliberately inert: it declares constants and
 * functions and does nothing else. No port is bound and nothing is printed
 * until a caller invokes {@link createServer} and listens on the server it
 * hands back. That is precisely what lets the test suite bind an ephemeral
 * port while a development instance keeps port 3000 to itself.
 *
 * Everything here is built on the Node.js core `http` module. The project has
 * zero runtime and zero development dependencies, so the HTTP mechanics stay
 * visible for a reader to learn from instead of hiding behind a framework.
 *
 * @module src/server
 */

const http = require('node:http');

/**
 * The single path this server recognises, written exactly as specified.
 * Every other pathname receives a 404.
 *
 * @type {string}
 */
const HELLO_PATH = '/hello';

/**
 * The response payload, written exactly as specified: eleven bytes, a
 * lowercase `w`, no comma, no exclamation mark and no trailing newline.
 * `Content-Length` is always measured from this same value, so the declared
 * length can never disagree with the bytes actually sent.
 *
 * @type {string}
 */
const HELLO_BODY = 'Hello world';

/**
 * The HTTP methods accepted on {@link HELLO_PATH}.
 *
 * `HEAD` is included because HTTP expects a server that answers `GET` for a
 * resource to answer `HEAD` for it as well — same headers, no body. The list
 * is frozen so that no consumer can silently widen the contract at runtime.
 *
 * @type {readonly string[]}
 */
const ALLOWED_METHODS = Object.freeze(['GET', 'HEAD']);

/**
 * The value of the `Allow` header sent with a 405 response, derived from
 * {@link ALLOWED_METHODS} so that the advertised methods and the methods the
 * router actually accepts can never drift apart.
 *
 * @type {string}
 */
const ALLOW_HEADER_VALUE = ALLOWED_METHODS.join(', ');

/**
 * The body returned for any pathname other than {@link HELLO_PATH} — nine
 * bytes of plain text.
 *
 * @type {string}
 */
const NOT_FOUND_BODY = 'Not Found';

/**
 * The body returned when {@link HELLO_PATH} is requested with a method that is
 * not in {@link ALLOWED_METHODS} — eighteen bytes of plain text.
 *
 * @type {string}
 */
const METHOD_NOT_ALLOWED_BODY = 'Method Not Allowed';

/**
 * The media type of every response. Stating the charset explicitly tells the
 * client how to decode the bytes instead of leaving it to guess.
 *
 * @type {string}
 */
const CONTENT_TYPE_TEXT_PLAIN = 'text/plain; charset=utf-8';

/**
 * Builds the header set shared by all three responses.
 *
 * `Content-Length` is measured from the very body that is about to be written,
 * which is the whole reason every response is funnelled through this helper: a
 * declared length cannot contradict the bytes that follow it when both come
 * from one value. Declaring the length also keeps each response a single
 * fixed-size write, so no chunked transfer encoding is ever negotiated.
 *
 * A fresh object is returned on each call, so a caller that needs one extra
 * header — the 405 writer adds `Allow` — cannot mutate shared state.
 *
 * @param {string} body The exact body that will be sent with these headers.
 * @returns {{[header: string]: string | number}} Headers ready for `writeHead`.
 */
function buildResponseHeaders(body) {
  return {
    'Content-Type': CONTENT_TYPE_TEXT_PLAIN,
    'Content-Length': Buffer.byteLength(body),
    // Stops a client from re-interpreting these plain-text bytes as some other
    // media type.
    'X-Content-Type-Options': 'nosniff',
    // Keeps a tutorial response from being served out of a cache after an edit.
    'Cache-Control': 'no-store',
  };
}

/**
 * Removes trailing slashes so that `/hello`, `/hello/` and `/hello//` all
 * describe the same resource — a reader who types the URL into a browser
 * should not be punished for a stray slash.
 *
 * The root path `/` is left untouched: it is a distinct pathname that must go
 * on returning 404, and stripping its only character would leave an empty
 * string. This is a matching detail of the one supported route, not a router.
 *
 * @param {string} pathname A URL pathname, which always begins with `/`.
 * @returns {string} The pathname with any trailing slashes removed.
 */
function normalisePathname(pathname) {
  let normalised = pathname;

  while (normalised.length > 1 && normalised.endsWith('/')) {
    normalised = normalised.slice(0, -1);
  }

  return normalised;
}

/**
 * Resolves the pathname a request is asking for.
 *
 * A raw request target may carry a query string (`/hello?a=1`), so it is
 * parsed with the `URL` constructor and only its `pathname` is used for
 * matching. Query strings are therefore irrelevant to routing, which is right
 * for a response that is a constant.
 *
 * `URL` needs an absolute base, assembled here from the request's `Host`
 * header. A client is free to send a malformed `Host`, which makes the
 * constructor throw, so the parse is guarded and falls back to the portion of
 * the raw target that precedes the query string. Either way the request gets a
 * correct answer.
 *
 * @param {http.IncomingMessage} req The inbound request.
 * @returns {string} The normalised pathname to match against {@link HELLO_PATH}.
 */
function resolvePathname(req) {
  let pathname;

  try {
    pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
  } catch {
    pathname = String(req.url).split('?')[0];
  }

  return normalisePathname(pathname);
}

/**
 * Writes the success response: `200 OK` carrying the payload.
 *
 * A `HEAD` request receives exactly the status line and headers a `GET` would
 * receive — `Content-Length: 11` included, since it advertises the size of the
 * resource — but no body, which is what HTTP specifies. The guard below states
 * that rule in the open; the runtime also suppresses bodies on `HEAD`
 * responses, so this is belt and braces on purpose, for the reader's benefit.
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

/**
 * Writes `404 Not Found` for any pathname other than {@link HELLO_PATH}.
 * A server has to answer every request it accepts, so "no such resource" is a
 * response rather than silence.
 *
 * @param {http.ServerResponse} res The response to write.
 * @returns {void}
 */
function sendNotFound(res) {
  res.writeHead(404, buildResponseHeaders(NOT_FOUND_BODY));
  res.end(NOT_FOUND_BODY);
}

/**
 * Writes `405 Method Not Allowed` for a request that reached the right path
 * with the wrong method.
 *
 * The `Allow` header is mandatory on a 405 and is taken from
 * {@link ALLOW_HEADER_VALUE}, so it lists precisely the methods the guard in
 * {@link handleRequest} accepts. Answering such a request with a 404 would
 * wrongly claim the resource does not exist.
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

/**
 * The request listener — three rules, checked in order. Every request matches
 * exactly one of them, so there is no path on which the server fails to
 * respond:
 *
 * 1. wrong path                → `404 Not Found`
 * 2. right path, wrong method  → `405 Method Not Allowed` (plus `Allow`)
 * 3. right path, right method  → `200 OK` with the payload
 *
 * Nothing else happens here. No request body is read, no query parameter
 * changes the outcome, no file is touched and nothing is evaluated, so whole
 * classes of attack — injection, deserialisation, path traversal, template
 * injection — have no entry point at all rather than merely being mitigated.
 *
 * @param {http.IncomingMessage} req The inbound request.
 * @param {http.ServerResponse} res The response to write.
 * @returns {void}
 */
function handleRequest(req, res) {
  const pathname = resolvePathname(req);

  // Rule 1 — `/hello` is the only resource this server exposes.
  if (pathname !== HELLO_PATH) {
    sendNotFound(res);
    return;
  }

  // Rule 2 — the resource exists, but not for this method.
  if (!ALLOWED_METHODS.includes(req.method)) {
    sendMethodNotAllowed(res);
    return;
  }

  // Rule 3 — the one success case, left last and unindented.
  sendHello(req, res);
}

/**
 * Creates a new, fully wired but **unbound** HTTP server.
 *
 * A factory rather than a shared singleton: every call returns its own server
 * and nothing is bound until the caller invokes `listen`. That keeps this
 * module import-safe and lets a test bind an ephemeral port while a
 * development instance holds port 3000.
 *
 * @example
 * const { createServer } = require('./src/server');
 *
 * const server = createServer();
 * server.listen(3000); // binding is the caller's decision, never this module's
 *
 * @returns {http.Server} A server that answers `/hello`, not yet listening.
 */
function createServer() {
  return http.createServer(handleRequest);
}

module.exports = {
  createServer,
  handleRequest,
  HELLO_PATH,
  HELLO_BODY,
  ALLOWED_METHODS,
  NOT_FOUND_BODY,
  METHOD_NOT_ALLOWED_BODY,
};
