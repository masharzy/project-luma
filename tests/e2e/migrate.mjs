// Creates a fresh test database and applies the repository migrations on plain PostgreSQL.
// Neon-managed objects the migrations reference (roles, neon_auth) are stubbed first.
// Usage: node tests/e2e/migrate.mjs postgres://user:pw@host:port/postgres e2e
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
const [admin = 'postgres://postgres:pw@127.0.0.1:54329/postgres', name = 'e2e'] = process.argv.slice(2);
if (!/^[a-z0-9_]+$/.test(name)) throw Error('Invalid database name');
const dir = path.resolve(new URL('../../migrations', import.meta.url).pathname);
const c0 = new pg.Client({ connectionString: admin });
await c0.connect();
await c0.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
await c0.query(`CREATE DATABASE ${name}`);
await c0.end();
const url = admin.replace(/\/[^/]*$/, '/' + name);
const stub = `DO $$BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='luma_auth_runtime') THEN CREATE ROLE luma_auth_runtime; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anonymous') THEN CREATE ROLE anonymous; END IF;
END$$;
CREATE SCHEMA IF NOT EXISTS neon_auth;
CREATE TABLE IF NOT EXISTS neon_auth.account(id text,"userId" text,"accountId" text,"providerId" text,password text,"createdAt" timestamptz,"updatedAt" timestamptz);
CREATE TABLE IF NOT EXISTS neon_auth."user"(id text,name text,email text,"emailVerified" boolean,image text,"createdAt" timestamptz,"updatedAt" timestamptz,role text,banned boolean,"banReason" text,"banExpires" timestamptz);`;
const skip = new Set(['002_import_managed_identity.sql']); // one-off import from the old managed auth; no data here
let failed = 0;
for (const file of ['(stubs)', ...fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()]) {
  if (skip.has(file)) continue;
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try { await c.query(file === '(stubs)' ? stub : fs.readFileSync(path.join(dir, file), 'utf8')); }
  catch (e) { failed++; console.error('migration failed', file, e.message); }
  await c.end();
}
console.log(failed ? `${failed} migrations failed` : 'migrations applied to ' + name);
process.exit(failed ? 1 : 0);
