import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
// Every app_auth.users column the app writes must be granted to luma_auth_runtime by some migration.
test('runtime role may update every app_auth.users column the app writes', () => {
  const files = []; const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) && files.push(p); } }; walk('src');
  const written = new Set();
  for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(/UPDATE app_auth\.users SET ([\s\S]*?) WHERE/g)) for (const c of m[1].matchAll(/([a-z_]+)\s*=/g)) written.add(c[1]);
  const granted = new Set();
  for (const f of fs.readdirSync('migrations')) for (const m of fs.readFileSync('migrations/' + f, 'utf8').matchAll(/GRANT UPDATE\s*\(([^)]*)\) ON app_auth\.users TO luma_auth_runtime/g)) for (const c of m[1].split(',')) granted.add(c.trim());
  const missing = [...written].filter(c => !granted.has(c));
  assert.ok(written.has('role'));
  assert.deepEqual(missing, [], 'missing grants: ' + missing.join(', '));
});
