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
 * The single path this server recognises, written exactly as specified. It is
 * compared against the path a client actually sent, allowing only a trailing
 * slash and a query string as differences, so every other spelling — including
 * ones a URL parser would fold into this one, such as `/x/../hello` — receives
 * a 404.
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
 * The root path `/` is left untouched: it is a distinct path that must go on
 * returning 404, and stripping its only character would leave an empty string.
 * A trailing slash is the *only* difference this function forgives; it rewrites
 * nothing else, which is what stops it from turning into a router.
 *
 * @param {string} pathname The path taken from the request target, ordinarily
 *   beginning with `/` — though nothing guarantees a client sent a well-formed
 *   one, and this function does not require it.
 * @returns {string} The path with any trailing slashes removed.
 */
function normalisePathname(pathname) {
  let normalised = pathname;

  while (normalised.length > 1 && normalised.endsWith('/')) {
    normalised = normalised.slice(0, -1);
  }

  return normalised;
}

/**
 * Resolves the path a request is asking for, taken from the request target
 * exactly as the client wrote it.
 *
 * A request target for an ordinary request is a path optionally followed by a
 * query string — `/hello?a=1` — so the path is everything before the first
 * `?`. Query strings are therefore irrelevant to routing, which is right for a
 * response that is a constant.
 *
 * **Why the raw target rather than the `URL` constructor.** Handing the target
 * to `new URL(...)` looks tidier and was the obvious first choice, but URL
 * parsing *canonicalises* what it is given: it resolves dot segments and
 * decodes their percent-encoded spellings, and it accepts the proxy-style
 * absolute form. `/x/../hello`, `/./hello`, `/hello/.`, `/hello/%2e` and
 * `http://any-host/hello` all come back out of it as `/hello`, so each would
 * have quietly become a second name for the one endpoint — and every one of
 * them is a path this project promises answers 404. Comparing the target as
 * sent keeps `/hello` the single accepted spelling, which is the contract this
 * project is here to demonstrate.
 *
 * Nothing here can throw: there is no parser to reject a malformed target, and
 * a target that is not a string at all — which the runtime does not produce for
 * a parsed request, but which costs one guard to rule out — resolves to the
 * empty string and falls through to the 404 writer like any other unknown path.
 *
 * @param {http.IncomingMessage} req The inbound request.
 * @returns {string} The normalised path to match against {@link HELLO_PATH}.
 */
function resolvePathname(req) {
  const target = typeof req.url === 'string' ? req.url : '';
  const queryStart = target.indexOf('?');
  const rawPath = queryStart === -1 ? target : target.slice(0, queryStart);

  return normalisePathname(rawPath);
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
 * The request listener — three rules, checked in order. Every request the HTTP
 * parser hands over matches exactly one of them, so no request this server
 * accepts goes unanswered:
 *
 * 1. wrong path                → `404 Not Found`
 * 2. right path, wrong method  → `405 Method Not Allowed` (plus `Allow`)
 * 3. right path, right method  → `200 OK` with the payload
 *
 * Those three answers are the whole of what this server says. What the rules
 * cannot cover is a message the parser never turns into a request in the first
 * place: a missing or unusable `Host` header, a malformed request line, headers
 * larger than the runtime allows, or a client that stops speaking mid-request.
 * Node.js answers those itself — `400`, `431`, or a timeout — before routing
 * begins, and those built-in protections are deliberately left untouched,
 * because they are what stops a half-sent request from occupying the server
 * indefinitely.
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

  // Rule 1 — `/hello` is the only resource this server exposes, and the only
  // spelling of it that is accepted. An exact comparison is the whole guarantee:
  // anything the client asked for that is not this string, however close it
  // looks, is a path this server does not have.
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
  HELLO_PATH,
  HELLO_BODY,
  ALLOWED_METHODS,
};
