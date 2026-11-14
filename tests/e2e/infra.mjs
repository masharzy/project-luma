// Local stand-ins for the managed services the app uses in production, so the real Next.js server can run
// end to end on a laptop or a CI runner: Neon's SQL-over-HTTP API (backed by a real PostgreSQL) and the
// private R2 bucket (an in-memory S3). Nothing here is used by the production build.
import http from 'node:http';
import pg from 'pg';

/** Neon serverless driver protocol: POST /sql {query, params} → {fields:[{name,dataTypeID}], rows:[[text]]}. */
export async function startNeonShim(pgUrl) {
  const raw = { getTypeParser: () => v => v };
  const pool = new pg.Pool({ connectionString: pgUrl, max: 12 });
  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const data = JSON.parse(body);
      const run = async q => {
        const r = await pool.query({ text: q.query, values: q.params, rowMode: 'array', types: raw });
        return { fields: (r.fields || []).map(f => ({ name: f.name, dataTypeID: f.dataTypeID })), rows: r.rows || [], command: r.command, rowCount: r.rowCount };
      };
      const out = Array.isArray(data.queries) ? { results: await Promise.all(data.queries.map(run)) } : await run(data);
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(out));
    } catch (e) {
      res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ message: e.message, code: e.code, detail: e.detail }));
    }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { port: server.address().port, pool, close: async () => { server.close(); await pool.end(); } };
}

/** Minimal path-style S3: PUT/GET/HEAD /bucket/key. Signatures are not checked (local only). */
export async function startFakeS3() {
  const objects = new Map();
  const server = http.createServer(async (req, res) => {
    const key = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (req.method === 'PUT') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      objects.set(key, { body: Buffer.concat(chunks), type: req.headers['content-type'] || 'application/octet-stream' });
      res.writeHead(200, { ETag: '"fixture"' }).end();
      return;
    }
    const o = objects.get(key);
    if (!o) { res.writeHead(404, { 'content-type': 'application/xml' }).end('<Error><Code>NoSuchKey</Code></Error>'); return; }
    res.writeHead(200, { 'content-type': o.type, 'content-length': o.body.length });
    res.end(req.method === 'HEAD' ? undefined : o.body);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { port: server.address().port, objects, close: () => server.close() };
}

/** `db()` replacement for code loaded directly in the test process: same `query(sql, params)` → rows contract. */
export function pgDb(pool) {
  return { query: async (sql, params = []) => (await pool.query(sql, params)).rows };
}
