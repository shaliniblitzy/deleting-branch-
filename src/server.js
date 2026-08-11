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
 * Resolves the path a request is asking for, taken from the request target
 * exactly as the client wrote it: everything before the first `?`, so a query
 * string cannot affect routing.
 *
 * The target is deliberately not handed to the `URL` constructor, whose
 * canonicalisation folds `/x/../hello`, `/./hello`, `/hello/%2e` and
 * `http://any-host/hello` into `/hello` and would give the one endpoint several
 * extra names. Nothing here can throw: a target that is not a string resolves to
 * the empty string and answers 404 like any other unknown path.
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
 * Serialises a response by hand, for the one case where the runtime hands over a
 * raw socket instead of an {@link http.ServerResponse} to write through: a status
 * line, one line per header, CRLF between them, and a blank line before the body.
 * The reason phrase is read from the runtime's own table, so the two halves of
 * the status line cannot disagree.
 *
 * @param {number} statusCode The status to report.
 * @param {{[header: string]: string | number}} headers The headers to send.
 * @param {string} body The body to send.
 * @returns {string} The complete response, ready to write to a socket.
 */
function serialiseResponse(statusCode, headers, body) {
  const lines = [`HTTP/1.1 ${statusCode} ${http.STATUS_CODES[statusCode]}`];

  for (const [name, value] of Object.entries(headers)) {
    lines.push(`${name}: ${value}`);
  }

  return `${lines.join('\r\n')}\r\n\r\n${body}`;
}

/**
 * Answers a `CONNECT` request — the one message {@link handleRequest} never sees,
 * because the runtime delivers it to the server's own `connect` event carrying
 * the raw socket, and a server that does not listen for it has the connection
 * closed underneath it with nothing said at all. Tunnelling is not on offer, so
 * the request is refused by the same two rules the request listener applies:
 * {@link HELLO_PATH} answers `405` with its `Allow` header, any other target
 * answers `404`. No tunnel is opened on either branch — the connection carries
 * the refusal and then ends.
 *
 * @param {http.IncomingMessage} req The inbound `CONNECT` request; its target is
 *   ordinarily an authority such as `example.com:443` rather than a path, which
 *   is one more reason it lands on the second rule.
 * @param {import('node:net').Socket} socket The raw connection, handed over
 *   without a response object to write through.
 * @returns {void}
 */
function handleConnect(req, socket) {
  // The socket arrives stripped of the http layer's own error handling, so a
  // client that disappears mid-write would otherwise raise an unhandled `error`
  // and take the process down with it. A refused tunnel whose client left is not
  // news, so the socket is simply released.
  socket.on('error', () => socket.destroy());

  const matchesEndpoint = resolvePathname(req) === HELLO_PATH;
  const statusCode = matchesEndpoint ? 405 : 404;
  const body = matchesEndpoint ? METHOD_NOT_ALLOWED_BODY : NOT_FOUND_BODY;
  const headers = buildResponseHeaders(body);

  if (matchesEndpoint) {
    headers.Allow = ALLOW_HEADER_VALUE;
  }

  // The two headers a response object would have added for us. `Connection:
  // close` states plainly what happens next: this connection carried a refusal,
  // not a tunnel, and it is finished.
  headers.Date = new Date().toUTCString();
  headers.Connection = 'close';

  // Released as soon as the refusal is on the wire, exactly as the `http` module
  // does after a `Connection: close` response. Waiting for the client to close
  // its own half instead would hold the socket, and the event loop with it, open
  // for as long as the client felt like it.
  socket.end(serialiseResponse(statusCode, headers, body), () => {
    socket.destroy();
  });
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
  const server = http.createServer(handleRequest);

  // Two listeners, because a client has two ways of reaching a server: the
  // request listener answers every message the parser turns into a request, and
  // this one answers the `CONNECT` the runtime routes elsewhere, which would
  // otherwise have its connection closed with no response at all. Both are
  // attached to the server being handed out, so requiring this module still
  // binds nothing and does nothing.
  server.on('connect', handleConnect);

  return server;
}

module.exports = {
  createServer,
  HELLO_PATH,
  HELLO_BODY,
  ALLOWED_METHODS,
};
