// Practice Listening audio follows the part the learner opens (part-by-part recordings), while books that repeat
// one full recording on every part keep playing untouched. Real production build + Chrome + PostgreSQL.
// Needs E2E_PG_URL with migrations applied, `npm run build`, Chrome (CHROME_PATH) and ffmpeg.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { startNeonShim, pgDb } from './infra.mjs';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const PG_URL = process.env.E2E_PG_URL || 'postgres://postgres:pw@127.0.0.1:54329/e2e';
const PORT = Number(process.env.E2E_PORT || 3124), ORIGIN = 'http://localhost:' + PORT;
const OUT = path.join(root, 'tests/e2e/output'); mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = async (name, fn) => { try { await fn(); results.push({ name, ok: true }); console.log('PASS', name); } catch (e) { results.push({ name, ok: false }); console.log('FAIL', name, '—', e.message, JSON.stringify(await globalThis.dbg?.())); } };
async function until(what, fn, ms = 15000) { const end = Date.now() + ms; while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch {} await sleep(250); } throw Error('Timed out: ' + what); }

// Four distinct 6-second recordings (one per part) and one 40-second "full" recording.
const clip = (name, freq, sec) => { const f = path.join(OUT, name); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `sine=frequency=${freq}:duration=${sec}`, '-b:a', '32k', f]); return f; };
const files = { 'p1.mp3': clip('p1.mp3', 300, 6), 'p2.mp3': clip('p2.mp3', 400, 6), 'p3.mp3': clip('p3.mp3', 500, 6), 'p4.mp3': clip('p4.mp3', 600, 6), 'full.mp3': clip('full.mp3', 700, 40) };

const neon = await startNeonShim(PG_URL);
const sql = pgDb(neon.pool);
async function practiceTest(title, urls) {
  const [c] = await sql.query("INSERT INTO public.admin_content(kind,title,sections,status,access,durations) VALUES('practice',$1,'[\"listening\"]','published','free','{\"listening\":30}') RETURNING id", [title]);
  const parts = urls.map((u, i) => ({ id: 'p' + (i + 1), title: 'Part ' + (i + 1), passage_text: 'Part ' + (i + 1) + ' notes', audio_url: u, question_groups: [] }));
  const questions = parts.flatMap((p, i) => [0, 1].map(j => ({ id: `q${i}${j}`, part_id: p.id, question_type: 'short_answer', question_text: `Part ${i + 1} question ${j + 1}`, correct_answer: 'A', order_index: i * 2 + j + 1 })));
  await sql.query("INSERT INTO public.exam_modules(kind,parent_id,module,content_id,document) VALUES('practice',$1,'listening',$1,$2::jsonb)", [c.id, JSON.stringify({ schemaVersion: 1, durationMinutes: 30, audioUrl: '', parts, questions })]);
  return String(c.id);
}
const A = 'https://audio.e2e.test/';
const perPart = await practiceTest('E2E per-part audio', ['p1', 'p2', 'p3', 'p4'].map(p => A + p + '.mp3'));
const sameUrl = await practiceTest('E2E one full recording', Array(4).fill(A + 'full.mp3'));

const server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-p', String(PORT)], { cwd: root, env: { ...process.env, NODE_ENV: 'production', NODE_OPTIONS: '--require ' + path.join(root, 'tests/e2e/preload.cjs'), DATABASE_URL: 'postgres://e2e:e2e@db.neon-shim.test/e2e', APP_ORIGIN: ORIGIN, E2E_NEON_SHIM: `http://127.0.0.1:${neon.port}/sql` }, stdio: 'ignore' });
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} });
await until('server', async () => (await fetch(ORIGIN + '/')).status < 500, 90000);

const consoleLog = [];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
async function open(parentId) {
  const ctx = await browser.newContext({ baseURL: ORIGIN, viewport: { width: 1366, height: 860 } });
  await ctx.route(A + '**', r => { const n = new URL(r.request().url()).pathname.slice(1); r.fulfill({ status: 200, contentType: 'audio/mpeg', body: readFileSync(files[n]) }); });
  const page = await ctx.newPage();
  page.on('console', m => consoleLog.push(m.type() + ': ' + m.text()));
  await page.goto('/');
  const id = await page.evaluate(async p => (await (await fetch('/api/exam-attempts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'practice', parentId: p, selection: 'listening' }) })).json()).id, parentId);
  await page.goto('/exam/attempt/' + id);
  await until('paper', () => page.locator('.exam-engine .ielts-part-strip').isVisible(), 30000);
  return page;
}
const audio = page => page.evaluate(() => { const a = document.querySelector('.exam-engine audio'); return a ? { src: a.currentSrc || a.src, paused: a.paused, t: a.currentTime, rs: a.readyState, ns: a.networkState, err: a.error?.code, n: document.querySelectorAll('.exam-engine audio').length } : null; });
const strip = page => page.locator('.exam-engine .ielts-part-strip strong').textContent();
const partTab = (page, n) => page.locator('.exam-engine .ielts-part-tab').nth(n - 1);
async function play(page) {
  const start = page.getByRole('button', { name: /^▶?\s*Play$/ });
  if (await start.isVisible().catch(() => false)) await start.click();
  else await page.locator('.exam-engine .ielts-audio-main').click();
  await until('playing', async () => (await audio(page))?.paused === false);
}

let p = await open(perPart);
globalThis.dbg = async () => ({ audio: await audio(p), strip: await strip(p), errs: await p.locator('.exam-engine').evaluate(e => [...e.querySelectorAll('[role=alert],.ielts-audio-error,.text-red-600')].map(x => x.textContent).join('|')).catch(() => ''), log: consoleLog.slice(-5) });
await check('per-part: Part 1 opens with Part 1 audio and plays', async () => {
  await play(p);
  assert.match((await audio(p)).src, /p1\.mp3$/);
});
await check('per-part: clicking Part 3 switches to Part 3 audio and keeps playing', async () => {
  await partTab(p, 3).click();
  await until('part 3 audio', async () => /p3\.mp3$/.test((await audio(p)).src) && !(await audio(p)).paused);
  assert.match(await strip(p), /Part 3/);
});
await check('per-part: paused, then Part 2 → Part 2 audio waits for Play; Play plays Part 2', async () => {
  await p.locator('.exam-engine .ielts-audio-main').click();
  await until('paused', async () => (await audio(p)).paused);
  await partTab(p, 2).click();
  await until('part 2 src', async () => /p2\.mp3$/.test((await audio(p)).src));
  await sleep(1200);
  assert.equal((await audio(p)).paused, true, 'must not start by itself');
  await play(p);
  assert.match((await audio(p)).src, /p2\.mp3$/);
});
await check('per-part: when Part 2 audio ends, the test moves on to Part 3 and plays it', async () => {
  await until('auto advance', async () => /Part 3/.test(await strip(p)) && /p3\.mp3$/.test((await audio(p)).src) && !(await audio(p)).paused, 20000);
});
await p.screenshot({ path: path.join(OUT, 'practice-audio-per-part.png') });
await p.context().close();

p = await open(sameUrl);
await check('one full recording: switching parts never restarts or pauses the audio', async () => {
  await play(p);
  await sleep(2500);
  const before = await audio(p);
  await partTab(p, 3).click();
  await sleep(1200);
  const after = await audio(p);
  assert.match(after.src, /full\.mp3$/); assert.equal(after.paused, false); assert.ok(after.t > before.t, 'time keeps running');
  assert.match(await strip(p), /Part 3/);
});
await browser.close(); server.kill('SIGTERM'); await neon.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
