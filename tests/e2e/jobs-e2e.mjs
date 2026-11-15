// Self-hosted job queue (public.app_jobs) on real PostgreSQL:
//  A. queue/worker semantics: idempotency, delay, exactly-once under concurrency, retry, lease expiry, retention
//  B. the worker started by src/instrumentation.ts inside `next start` (not Vercel) runs a real mock job by itself
// Needs E2E_PG_URL (migrations applied) and `npm run build`.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { startNeonShim, pgDb } from './infra.mjs';
const root = path.resolve(new URL('../..', import.meta.url).pathname);
const native = createRequire(import.meta.url);
const PG_URL = process.env.E2E_PG_URL || 'postgres://postgres:pw@127.0.0.1:54329/e2e';
const PORT = Number(process.env.E2E_PORT || 3125);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = async (name, fn) => { try { await fn(); results.push(true); console.log('PASS', name); } catch (e) { results.push(false); console.log('FAIL', name, '—', e.message); } };
const neon = await startNeonShim(PG_URL);
const sql = pgDb(neon.pool);
const q1 = async (t, p) => (await sql.query(t, p))[0];
function loader(mocks) {
  const cache = new Map();
  return function load(file) {
    if (cache.has(file)) return cache.get(file);
    const m = { exports: {} }; cache.set(file, m.exports);
    const code = ts.transpileModule(readFileSync(path.join(root, 'src', file + '.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('require', 'module', 'exports', code)(p => p === 'server-only' ? {} : Object.hasOwn(mocks, p) ? mocks[p] : p.startsWith('./') ? load(path.posix.normalize(path.posix.dirname(file) + '/' + p)) : p.startsWith('@/') ? load(p.slice(2)) : native(p), m, m.exports);
    cache.set(file, m.exports); return m.exports;
  };
}
process.env.JOBS_BACKEND = 'postgres';
const load = loader({ '@/lib/auth/db': { db: () => sql }, '@vercel/queue': { send: async () => { throw Error('Vercel Queues must not be used off Vercel'); } },
  '@/lib/evaluation/worker': {}, '@/lib/products/speaking-worker': {}, '@/lib/exam/mock-evaluation': {}, '@/lib/exam/mock-reminders': {} });
const queue = load('lib/jobs/queue'), worker = load('lib/jobs/pg-worker'), { jobHandlers } = load('lib/jobs/handlers');
const runs = [];
jobHandlers['e2e-ok'] = { run: async m => { runs.push(m.n); await sleep(20); }, visibilityTimeoutSeconds: 30, retryAfterSeconds: 1 };
jobHandlers['e2e-fail'] = { run: async () => { throw Error('Provider unavailable'); }, visibilityTimeoutSeconds: 30, retryAfterSeconds: 60 };
await sql.query("DELETE FROM public.app_jobs WHERE topic LIKE 'e2e-%'");

await check('backend: off Vercel the app uses the Postgres queue; on Vercel, Vercel Queues', async () => {
  delete process.env.JOBS_BACKEND; delete process.env.VERCEL; assert.equal(queue.jobsBackend(), 'postgres');
  process.env.VERCEL = '1'; assert.equal(queue.jobsBackend(), 'vercel'); delete process.env.VERCEL;
  process.env.JOBS_BACKEND = 'postgres';
});
await check('enqueue: same idempotency key is a no-op; a delayed job waits for its time', async () => {
  await queue.enqueue('e2e-ok', { n: 'dup' }, { idempotencyKey: 'e2e:dup' });
  await queue.enqueue('e2e-ok', { n: 'dup' }, { idempotencyKey: 'e2e:dup' });
  await queue.enqueue('e2e-ok', { n: 'later' }, { idempotencyKey: 'e2e:later', delaySeconds: 3600 });
  assert.equal((await q1("SELECT count(*)::int n FROM public.app_jobs WHERE idempotency_key='e2e:dup'")).n, 1);
  assert.equal(await worker.drainJobs(), 1); assert.deepEqual(runs, ['dup']);
  assert.equal(await worker.drainJobs(), 0, 'delayed job must not run yet');
  await sql.query("UPDATE public.app_jobs SET run_at=now() WHERE idempotency_key='e2e:later'");
  assert.equal(await worker.drainJobs(), 1); assert.deepEqual(runs, ['dup', 'later']);
});
await check('exactly once: 40 jobs, 6 workers in parallel — every job runs once', async () => {
  runs.length = 0;
  for (let i = 0; i < 40; i++) await queue.enqueue('e2e-ok', { n: i }, { idempotencyKey: 'e2e:par:' + i });
  await Promise.all(Array.from({ length: 6 }, () => worker.drainJobs(40)));
  assert.equal(runs.length, 40); assert.equal(new Set(runs).size, 40);
  assert.equal((await q1("SELECT count(*)::int n FROM public.app_jobs WHERE idempotency_key LIKE 'e2e:par:%' AND done_at IS NULL")).n, 0);
});
await check('failure: retried later with the error kind kept; an expired job is never run', async () => {
  await queue.enqueue('e2e-fail', { secret: 'learner text' }, { idempotencyKey: 'e2e:fail' });
  assert.equal(await worker.drainJobs(), 1);
  const r = await q1("SELECT attempts, done_at, last_error, run_at>now()+interval '50 seconds' later FROM public.app_jobs WHERE idempotency_key='e2e:fail'");
  assert.equal(r.attempts, 1); assert.equal(r.done_at, null); assert.equal(r.later, true); assert.equal(r.last_error, 'Provider unavailable');
  await sql.query("UPDATE public.app_jobs SET run_at=now(), expires_at=now()-interval '1 second' WHERE idempotency_key='e2e:fail'");
  assert.equal(await worker.drainJobs(), 0);
});
await check('crash safety: a job whose lease expired (process died mid-job) is picked up again', async () => {
  runs.length = 0;
  await queue.enqueue('e2e-ok', { n: 'lease' }, { idempotencyKey: 'e2e:lease' });
  await sql.query("UPDATE public.app_jobs SET attempts=1, locked_until=now()+interval '1 minute' WHERE idempotency_key='e2e:lease'");
  assert.equal(await worker.drainJobs(), 0, 'locked job is not taken');
  await sql.query("UPDATE public.app_jobs SET locked_until=now()-interval '1 second' WHERE idempotency_key='e2e:lease'");
  assert.equal(await worker.drainJobs(), 1); assert.deepEqual(runs, ['lease']);
});
await sql.query("DELETE FROM public.app_jobs WHERE topic LIKE 'e2e-%'");

// ---- B. inside `next start`, not on Vercel ----
const [content] = await sql.query("INSERT INTO public.admin_content(kind,title,sections,status,access,durations) VALUES('mock','Jobs E2E','[\"listening\"]','published','free','{\"listening\":30}') RETURNING id");
const [mock] = await sql.query("INSERT INTO public.mock_events(id,title,access,starts_at,ends_at,snapshot) VALUES($1,'Jobs E2E','free',now()-interval '3 hours',now()-interval '1 hour','[]'::jsonb) RETURNING id", [content.id]);
const snapshot = [{ module: 'listening', document: { durationMinutes: 30, audioUrl: '', parts: [{ id: 'p1', passage_text: 'x', question_groups: [] }], questions: [{ id: 'l0', part_id: 'p1', question_type: 'short_answer', question_text: 'Q', correct_answer: 'A', order_index: 1 }, { id: 'l1', part_id: 'p1', question_type: 'short_answer', question_text: 'Q', correct_answer: 'B', order_index: 2 }] } }];
const attemptId = randomUUID();
await sql.query("UPDATE public.mock_events SET snapshot=$2::jsonb WHERE id=$1", [mock.id, JSON.stringify(snapshot)]);
await sql.query(`INSERT INTO public.exam_attempts(id,kind,parent_id,owner_hash,title,snapshot,answers,results,current_index,deadline,scheduled_start)
  VALUES($1,'mock',$2,'e2e','Jobs E2E',$3::jsonb,$4::jsonb,'[]'::jsonb,0,now()-interval '2 hours',now()-interval '3 hours')`, [attemptId, mock.id, JSON.stringify(snapshot), JSON.stringify({ 0: { l0: 'A', l1: 'x' } })]);
const server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-p', String(PORT)], { cwd: root, env: { ...process.env, VERCEL: '', JOBS_BACKEND: '', NODE_ENV: 'production', JOBS_POLL_MS: '500', NODE_OPTIONS: '--require ' + path.join(root, 'tests/e2e/preload.cjs'), DATABASE_URL: 'postgres://e2e:e2e@db.neon-shim.test/e2e', APP_ORIGIN: 'http://localhost:' + PORT, E2E_NEON_SHIM: `http://127.0.0.1:${neon.port}/sql` }, stdio: ['ignore', 'pipe', 'pipe'] });
let out = ''; server.stdout.on('data', d => out += d); server.stderr.on('data', d => out += d);
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} });
await check('next start (self-hosted): the worker starts by itself and settles an abandoned mock from the queue', async () => {
  for (let i = 0; i < 120 && !/Self-hosted job worker started/.test(out); i++) await sleep(500);
  assert.match(out, /Self-hosted job worker started/);
  await sql.query("INSERT INTO public.app_jobs(topic,payload,idempotency_key,expires_at) VALUES('jumptonine-mock-evaluation',$1::jsonb,$2,now()+interval '1 day')", [JSON.stringify({ attemptId, module: 'settle' }), 'mock-settle:' + attemptId]);
  let row;
  for (let i = 0; i < 40; i++) { row = await q1('SELECT current_index, results FROM public.exam_attempts WHERE id=$1', [attemptId]); if (row.current_index === 1) break; await sleep(500); }
  assert.equal(row.current_index, 1, 'attempt settled'); assert.equal(row.results[0].correct, 1);
  const job = await q1('SELECT done_at, attempts FROM public.app_jobs WHERE idempotency_key=$1', ['mock-settle:' + attemptId]);
  assert.ok(job.done_at, 'job marked done'); assert.equal(job.attempts, 1);
});
server.kill('SIGTERM'); await neon.close();
const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
