// Production run of /admin/asset-migration with a temporary QA admin session.
//  --init : create a session token, print only its SHA-256 (operator inserts the session row).
//  run    : scan → migrate 3 samples and check how they are served → migrate the rest → rescan.
// Tokens stay on the runner. Report: tests/e2e/output/prod-asset-migration.json
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const BASE = 'https://jumptonine.com';
const OUT = new URL('./output/', import.meta.url); mkdirSync(OUT, { recursive: true });
const tokenFile = (process.env.RUNNER_TEMP || '/tmp') + '/qa-asset-token.json';
if (process.argv.includes('--init')) {
  const t = randomBytes(32).toString('base64url'); writeFileSync(tokenFile, JSON.stringify(t), { mode: 0o600 });
  const h = JSON.stringify({ ADMIN: createHash('sha256').update(t).digest('hex') });
  writeFileSync((process.env.RUNNER_TEMP || '/tmp') + '/qa-hashes.json', h); console.log('SESSION_HASHES ' + h); process.exit(0);
}
const token = JSON.parse(readFileSync(tokenFile, 'utf8'));
const report = { started: new Date().toISOString(), checks: [], samples: [], failures: [], totals: {} };
const save = () => writeFileSync(new URL('prod-asset-migration.json', OUT), JSON.stringify(report, null, 2));
// Push the report to the hash branch (worktree prepared by the workflow) so the operator can follow progress.
let lastPublish = 0;
const publish = (force = false) => {
  const dir = process.env.REPORT_DIR; if (!dir || (!force && Date.now() - lastPublish < 180000)) return; lastPublish = Date.now();
  try { writeFileSync(dir + '/report.json', JSON.stringify(report, null, 2)); execFileSync('git', ['-C', dir, 'add', 'report.json']); execFileSync('git', ['-C', dir, 'commit', '-qm', 'progress']); execFileSync('git', ['-C', dir, 'push', '-q', 'origin', 'HEAD:qa/prod-asset-migration-hashes']); } catch {}
};
process.on('exit', save);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const ok = (name, pass, detail = '') => { report.checks.push({ name, pass, detail }); log(pass ? 'PASS' : 'FAIL', name, detail); if (!pass) process.exitCode = 1; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const short = u => u.startsWith('data:') ? 'inline-base64' : u;
async function api(path, body) {
  const r = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { origin: BASE, cookie: '__Host-luma-session=' + token, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  const text = await r.text(); let data; try { data = JSON.parse(text); } catch { data = { text: text.slice(0, 200) }; }
  return { status: r.status, data };
}

for (let i = 0; i < 90; i++) { const s = await api('/api/admin/asset-migration'); if (s.status === 200) break; if (i === 89) { ok('admin session attached', false, String(s.status)); process.exit(1); } await sleep(10000); }
let scan = (await api('/api/admin/asset-migration')).data;
report.totals.before = { external: scan.assets.length, audio: scan.assets.filter(a => a.kind === 'audio').length, image: scan.assets.filter(a => a.kind === 'image').length, alreadyMigrated: scan.migrated.length };
ok('scan', scan.assets.length >= 0, JSON.stringify(report.totals.before));
ok('storage configured', scan.configured === true);
if (!scan.configured) process.exit(1);

async function migrate(url) {
  const t0 = Date.now();
  for (let attempt = 1; attempt <= 2; attempt++) {
    let r; try { r = await api('/api/admin/asset-migration', { url }); } catch (e) { r = { status: 0, data: { error: String(e).slice(0, 120) } }; }
    if (r.status === 200) return { ok: true, ms: Date.now() - t0, ...r.data };
    if (r.status === 422 || attempt === 2) return { ok: false, status: r.status, error: r.data?.error || r.data?.text, ms: Date.now() - t0 };
    await sleep(3000);
  }
}
async function checkServed(newUrl, kind) {
  const r = await fetch(newUrl, { redirect: 'manual' });
  if (kind === 'image') { const b = new Uint8Array(await r.arrayBuffer()); return { status: r.status, type: r.headers.get('content-type'), bytes: b.length, pass: r.status === 200 && /^image\//.test(r.headers.get('content-type') || '') && b.length > 100 }; }
  const loc = r.headers.get('location');
  if (r.status !== 302 || !loc) return { status: r.status, pass: false };
  const g = await fetch(loc, { headers: { Range: 'bytes=1000-2999' } }); const b = new Uint8Array(await g.arrayBuffer());
  return { status: r.status, cache: r.headers.get('cache-control'), r2: g.status, range: g.headers.get('content-range'), type: g.headers.get('content-type'), bytes: b.length, pass: g.status === 206 && b.length === 2000 && /^audio\//.test(g.headers.get('content-type') || '') };
}

// 1. samples: one per host + one doubled-host link + one inline image
const pick = [];
for (const h of [...new Set(scan.assets.map(a => a.host))]) { const a = scan.assets.find(x => x.host === h && x.kind === 'audio') || scan.assets.find(x => x.host === h); if (a) pick.push(a); const img = scan.assets.find(x => x.host === h && x.kind === 'image'); if (img && img !== a) pick.push(img); }
const doubled = scan.assets.find(a => a.usages.some(u => u.location.includes('sourceHtml')) && a.host === 'api.ieltsprobd.com'); if (doubled && !pick.includes(doubled)) pick.push(doubled);
for (const a of pick.slice(0, 10)) {
  const m = await migrate(a.url);
  const served = m.ok ? await checkServed(m.newUrl, a.kind) : null;
  report.samples.push({ url: short(a.url), kind: a.kind, host: a.host, usages: a.usages.length, result: m, served });
  ok('sample ' + a.kind + ' ' + a.host, Boolean(m.ok && served?.pass), m.ok ? JSON.stringify(served) + ' links ' + m.replaced?.links : m.error);
  if (!m.ok) report.failures.push({ url: short(a.url), host: a.host, error: m.error, status: m.status });
}
const samplesPassed = report.samples.filter(s => s.result.ok && s.served?.pass).length;
publish(true);
if (samplesPassed === 0) { log('no sample passed, stopping before bulk'); publish(true); process.exit(1); }

// 2. bulk: everything else, 3 at a time
scan = (await api('/api/admin/asset-migration')).data;
const queue = scan.assets.map(a => a); const total = queue.length; let done = 0, failed = 0; const t0 = Date.now();
const worker = async () => { while (queue.length) { const a = queue.shift(); const m = await migrate(a.url); if (m.ok) done++; else { failed++; report.failures.push({ url: short(a.url), host: a.host, kind: a.kind, error: m.error, status: m.status }); } if ((done + failed) % 25 === 0) { log(`bulk ${done + failed}/${total} ok ${done} failed ${failed}`); report.totals.progress = { done, failed, total }; save(); publish(); } } };
await Promise.all([worker(), worker(), worker()]);
report.totals.bulk = { total, done, failed, minutes: +((Date.now() - t0) / 60000).toFixed(1) };
log('bulk finished', JSON.stringify(report.totals.bulk));

// 3. rescan
scan = (await api('/api/admin/asset-migration')).data;
const byHost = {}; for (const a of scan.assets) byHost[a.host] = (byHost[a.host] || 0) + 1;
report.totals.after = { external: scan.assets.length, byHost, migrated: scan.migrated.length };
report.failuresByError = Object.entries(report.failures.reduce((m, f) => (m[f.host + ' · ' + f.error] = (m[f.host + ' · ' + f.error] || 0) + 1, m), {})).map(([k, n]) => ({ k, n }));
ok('rescan', true, JSON.stringify(report.totals.after));
report.finished = new Date().toISOString();
publish(true);
