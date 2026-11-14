// Loaded with `node --require` into the Next.js server during local end-to-end tests only.
// Routes the Neon HTTP driver to the local PostgreSQL shim and the R2 client to the in-memory S3.
const http = require('node:http');
const https = require('node:https');
const NEON = process.env.E2E_NEON_SHIM;   // e.g. http://127.0.0.1:5433/sql
const S3 = process.env.E2E_FAKE_S3;       // e.g. 127.0.0.1:9000
if (NEON) {
  const real = globalThis.fetch;
  globalThis.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
    if (url && /^https:\/\/[^/]*neon-shim\.test\//.test(url)) return real(NEON, init);
    return real(input, init);
  };
}
if (S3) {
  const [host, port] = S3.split(':');
  const realRequest = https.request;
  https.request = function (options, ...rest) {
    const o = typeof options === 'string' || options instanceof URL ? new URL(options) : options;
    const hostname = o.hostname || o.host;
    if (hostname && String(hostname).endsWith('.r2.cloudflarestorage.com')) {
      const plain = o instanceof URL ? { path: o.pathname + o.search, method: 'GET' } : (({ agent, ...rest }) => rest)(o);
      return http.request({ ...plain, protocol: 'http:', hostname: host, host, port: Number(port) }, ...rest);
    }
    return realRequest.call(this, options, ...rest);
  };
}
