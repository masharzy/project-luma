// Robotic end-to-end run of a scheduled mock exam on the real Next.js production build, in a real Chrome.
// Four candidates join one mock and behave like real people (answer, lose the connection, close the browser,
// reload, record Speaking). The queue worker and the AI are replaced by the same server functions with a
// deterministic grader, then an admin edits a mark and publishes. Every expectation is checked in the database.
//
// Needs: a PostgreSQL URL with the migrations applied (E2E_PG_URL), `npm run build` done, and Chrome (CHROME_PATH).
// Run:   node tests/e2e/mock-e2e.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { startNeonShim, startFakeS3, pgDb } from './infra.mjs';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const native = createRequire(import.meta.url);
const PG_URL = process.env.E2E_PG_URL || 'postgres://postgres:pw@127.0.0.1:54329/e2e';
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const PORT = Number(process.env.E2E_PORT || 3123);
const ORIGIN = 'http://localhost:' + PORT;
const OUT = path.join(root, 'tests/e2e/output');
mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const results = [];
let onFail = null;
const check = async (name, fn) => {
  try { await fn(); results.push({ name, ok: true }); log('PASS', name); }
  catch (e) { results.push({ name, ok: false, error: e.message }); log('FAIL', name, '—', e.message); await onFail?.(name); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(what, fn, ms = 30000, every = 400) {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(every); }
  throw Error('Timed out waiting for ' + what + (last ? ' (' + last.message + ')' : ''));
}

// ---------- services ----------
const neon = await startNeonShim(PG_URL);
const s3 = await startFakeS3();
const sql = pgDb(neon.pool);
const q1 = async (text, params) => (await sql.query(text, params))[0];

// ---------- the app's own server code, loaded in this process for fixtures and the queue worker ----------
const aiCalls = { writing: [], speaking: [] };
function words(t) { return (t.match(/[\p{L}\p{N}']+/gu) || []).length; }
const crit = b => ({ band: b, evidence: ['fixture'], feedback: 'fixture' });
const fakeAi = {
  '@/lib/evaluation/provider': {
    evaluationConfigured: async () => true,
    assessWriting: async input => {
      aiCalls.writing.push(input);
      // Deterministic stand-in for the rubric model: long answers get 6, very short ones are unscorable (zero placeholders).
      const tasks = input.tasks.map(t => { const ok = words(t.answer) >= 50; return { task: t.task, scorable: ok, limitation: ok ? '' : 'Too short', taskAchievement: crit(ok ? 6 : 0), coherence: crit(ok ? 6 : 0), lexicalResource: crit(ok ? 6 : 0), grammar: crit(ok ? 6 : 0), corrections: [], nextSteps: ['Write more'] }; });
      return { result: { tasks, summary: 'Fixture rubric feedback', estimatedBand: tasks.every(t => t.scorable) ? 6 : null }, model: 'e2e-fixture', usage: {} };
    },
  },
  '@/lib/products/speaking-provider': {
    assessSpeaking: async input => {
      for (const c of input.clips) {
        const o = s3.objects.get([...s3.objects.keys()].find(k => k.endsWith(c.key)));
        if (!o || o.body.subarray(0, 4).toString() !== 'RIFF' || o.body.length < 1000) throw Error('Clip missing or not WAV: ' + c.key);
      }
      aiCalls.speaking.push(input);
      const complete = input.clips.length === input.expected;
      return { result: { scorable: true, confidence: 'medium', limitation: '', transcripts: input.clips.map(c => ({ step: c.step, verbatim: 'Fixture transcript for step ' + c.step, uncertain: [] })), fluency: crit(6.5), lexicalResource: crit(6.5), grammar: crit(6.5), pronunciation: crit(6.5), summary: 'Fixture speaking feedback', nextSteps: [], estimatedBand: complete ? 6.5 : null }, model: 'e2e-fixture-audio', usage: {} };
    },
  },
};
let sessionUser = null;
function loader(mocks) {
  const cache = new Map();
  return function load(file) {
    if (cache.has(file)) return cache.get(file);
    const m = { exports: {} };
    const code = ts.transpileModule(readFileSync(path.join(root, 'src', file + '.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    cache.set(file, m.exports);
    new Function('require', 'module', 'exports', code)(p => p === 'server-only' ? {} : Object.hasOwn(mocks, p) ? mocks[p] : p.startsWith('./') || p.startsWith('../') ? load(path.posix.normalize(path.posix.dirname(file) + '/' + p)) : p.startsWith('@/') ? load(p.slice(2)) : native(p), m, m.exports);
    cache.set(file, m.exports);
    return m.exports;
  };
}
const load = loader({
  '@/lib/auth/db': { db: () => sql },
  '@/lib/auth/session': { readSession: async () => sessionUser && { user: sessionUser } },
  'next/headers': { cookies: async () => ({ get: () => undefined }), headers: async () => new Map() },
  '@vercel/queue': { send: async () => {} },
  ...fakeAi,
});
const events = load('lib/exam/mock-events');
const worker = load('lib/exam/mock-evaluation');

// ---------- fixtures ----------
const token = () => randomBytes(32).toString('base64url');
const digest = v => createHash('sha256').update(v).digest('hex');
async function user(name, role = 'user') {
  const id = randomUUID(), t = token();
  await sql.query("INSERT INTO app_auth.users(id,name,email,email_verified,role) VALUES($1,$2,$3,true,$4)", [id, name, 'e2e-' + id + '@example.invalid', role]);
  await sql.query("INSERT INTO app_auth.sessions(token_hash,user_id,session_version,expires_at) VALUES($1,$2,1,now()+interval '1 day')", [digest(t), id]);
  return { id, name, token: t, role };
}
const admin = await user('E2E Admin', 'admin');
const robots = { A: await user('Robot A · Listening, offline, closes browser'), B: await user('Robot B · two lines of Writing, closes at once'), C: await user('Robot C · two Speaking answers, reload, offline'), D: await user('Robot D · full Speaking, submits') };
const FOCUS = process.env.E2E_FOCUS === 'speaking'; // quick loop: a Speaking-only mock
const WFOCUS = process.env.E2E_FOCUS === 'writing'; // quick loop: a Writing-only mock (Robot B)
const MODULES = FOCUS ? ['speaking'] : WFOCUS ? ['writing'] : ['listening', 'reading', 'writing', 'speaking'];
const MIN = { listening: 1, reading: 1, writing: 2 };
// Listening recording, served to Chrome from an https test host by request routing (no network needed).
const audioFile = path.join(OUT, 'listening.mp3');
{ const { execFileSync } = native('node:child_process'); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=70', '-b:a', '32k', audioFile]); }
const content = await q1("INSERT INTO public.admin_content(kind,title,sections,status,scheduled_at,durations,access) VALUES('mock','E2E robotic mock',$2::jsonb,'draft',now()+interval '1 hour',$1::jsonb,'free') RETURNING id", [JSON.stringify({ ...MIN, speaking: 15 }), JSON.stringify(MODULES)]);
const mockId = String(content.id);
for (const module of ['listening', 'reading', 'writing']) {
  const writing = module === 'writing';
  const parts = writing ? [{ id: 'w1', passage_text: 'Task 1. The chart shows bus use in Dhaka. Summarise it.', question_groups: [] }, { id: 'w2', passage_text: 'Task 2. Should public transport be free? Discuss.', question_groups: [] }] : [{ id: 'p1', passage_text: 'Fixture passage for ' + module + '.', question_groups: [] }];
  const document = { schemaVersion: 1, durationMinutes: MIN[module], audioUrl: module === 'listening' ? 'https://audio.e2e.test/listening.mp3' : '', ...(writing ? { mockSetup: { mode: 'manual' } } : {}), parts, questions: writing ? [] : Array.from({ length: 5 }, (_, i) => ({ id: module[0] + i, part_id: 'p1', question_type: 'short_answer', question_text: 'Question ' + (i + 1) + ': write A', correct_answer: 'A', order_index: i + 1 })) };
  await sql.query("INSERT INTO public.exam_modules(kind,parent_id,module,content_id,document) VALUES('mock',$1,$2,$1,$3::jsonb)", [mockId, module, JSON.stringify((FOCUS || WFOCUS) && writing ? { ...document, mockSetup: { mode: 'manual', modules: MODULES } } : document)]);
}
const speakingSet = { part1: ['Where do you live?'], cueCard: { topic: 'Describe a journey you remember.', points: ['Where you went', 'Who you went with'], explain: 'Explain why you remember it.' }, rounding: [], part3: ['Why do people travel?'] };
const bank = await q1("INSERT INTO public.speaking_sets(title,document,published,minutes) VALUES('E2E Speaking set',$1::jsonb,true,15) RETURNING id", [JSON.stringify(speakingSet)]);
sessionUser = { id: admin.id, role: 'admin', emailVerified: true };
await events.prepareMock(mockId, admin.id, String(bank.id));
const ev = await q1('SELECT snapshot FROM public.mock_events WHERE id=$1', [mockId]);
log('mock prepared', mockId, ev.snapshot.map(s => s.module + ':' + (s.document.durationMinutes ?? '')).join(' '));
for (const r of Object.values(robots)) await sql.query('INSERT INTO public.mock_registrations(mock_id,user_id) VALUES($1,$2)', [mockId, r.id]);
// Join window open for ~25 more seconds; Listening starts in ~40 s (3 min join window + 15 s loading).
await sql.query("UPDATE public.mock_events SET starts_at=now()-interval '155 seconds',ends_at=now()-interval '155 seconds'+$2::interval WHERE id=$1", [mockId, (3 * 60 + 15 + (FOCUS ? 15 : WFOCUS ? MIN.writing + 1 : MIN.listening + MIN.reading + MIN.writing + 15 + 3) * 60) + ' seconds']);

// ---------- the real Next.js server ----------
const server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-p', String(PORT)], {
  cwd: root,
  env: { ...process.env, NODE_ENV: 'production', NODE_OPTIONS: '--require ' + path.join(root, 'tests/e2e/preload.cjs'), DATABASE_URL: 'postgres://e2e:e2e@db.neon-shim.test/e2e', APP_ORIGIN: ORIGIN, E2E_NEON_SHIM: `http://127.0.0.1:${neon.port}/sql`, E2E_FAKE_S3: `127.0.0.1:${s3.port}`, R2_ENDPOINT: 'https://e2e.r2.cloudflarestorage.com', R2_ACCESS_KEY_ID: 'e2e', R2_SECRET_ACCESS_KEY: 'e2e', R2_BUCKET: 'e2e', OPENROUTER_API_KEY: '', DASHSCOPE_API_KEY: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverLog = [];
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} });
server.stdout.on('data', d => serverLog.push(String(d)));
server.stderr.on('data', d => serverLog.push(String(d)));
await until('Next.js server', async () => (await fetch(ORIGIN + '/api/mocks/' + mockId)).ok, 90000, 500).catch(e => { console.error(serverLog.join('').slice(-4000)); throw e; });
log('server ready');

// ---------- Chrome with a fake microphone that "speaks" ----------
const wav = path.join(OUT, 'speech.wav');
{ // 6 s of a voice-like modulated tone, 16 kHz mono 16-bit.
  const rate = 16000, n = rate * 6, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { const t = i / rate; b.writeInt16LE(Math.round(9000 * Math.sin(2 * Math.PI * 180 * t) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 3 * t))), 44 + i * 2); }
  writeFileSync(wav, b);
}
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + wav, '--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
async function contextFor(r) {
  const ctx = await browser.newContext({ baseURL: ORIGIN, viewport: { width: 1366, height: 860 }, permissions: ['microphone'] });
  await ctx.addCookies([{ name: 'luma-session', value: r.token, url: ORIGIN }]);
  await ctx.addInitScript(() => { try { localStorage.setItem('j9-speaking-auto', '0'); } catch {} });
  await ctx.route('https://audio.e2e.test/**', route => route.fulfill({ status: 200, contentType: 'audio/mpeg', body: readFileSync(audioFile) }));
  return ctx;
}
const attemptOf = async r => (await q1('SELECT attempt_id FROM public.mock_registrations WHERE mock_id=$1 AND user_id=$2', [mockId, r.id]))?.attempt_id;
const attemptRow = async r => q1('SELECT * FROM public.exam_attempts WHERE id=$1', [await attemptOf(r)]);
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + '.png') }).catch(() => {});
async function joinViaUi(page, r) {
  await page.goto('/mocks/' + mockId);
  await page.getByRole('button', { name: /Join now/ }).click({ timeout: 20000 });
  await until(r.name + ' joined', async () => Boolean(await attemptOf(r)), 15000);
}

const twoLines = 'I think public transport is important.\nIt helps many people.';
const ctx = {};
const page = {};
process.on('unhandledRejection', async e => { log('FATAL', e.message); for (const [k, p] of Object.entries(page)) await shot(p, 'fatal-' + k); writeFileSync(path.join(OUT, 'server.log'), serverLog.join('').slice(-30000)); process.exit(1); });
const browserLog = [];
onFail = async name => { const tag = name.slice(0, 24).replace(/[^a-z0-9]+/gi, '-'); for (const [k, p] of Object.entries(page)) { if (p.isClosed()) continue; await shot(p, 'fail-' + tag + '-' + k); const f = p.frames().find(f => f.url().includes('/speaking/evaluation/')); if (f) browserLog.push(k + ' room: ' + JSON.stringify(await f.evaluate(() => ({ action: document.getElementById('main-action')?.textContent, disabled: document.getElementById('main-action')?.disabled, status: document.getElementById('room-status')?.textContent, meta: document.getElementById('question-meta')?.textContent, toast: document.querySelector('.toast, [role=status], #toast')?.textContent, phase: window.LumaSpeaking?.phase })).catch(e => e.message))); } writeFileSync(path.join(OUT, 'browser.log'), browserLog.join('\n')); };
for (const k of Object.keys(robots)) { ctx[k] = await contextFor(robots[k]); ctx[k].on('page', p => { p.on('console', m => { if (['error', 'warning'].includes(m.type())) browserLog.push(k + ' console.' + m.type() + ': ' + m.text()); }); p.on('pageerror', e => browserLog.push(k + ' pageerror: ' + e.message)); p.on('response', async r => { if (/speaking\/recording|api\/mocks\/speaking/.test(r.url()) && r.request().method() === 'POST') browserLog.push(k + ' ' + r.status() + ' ' + r.url().replace(ORIGIN, '') + ' ' + (await r.text().catch(() => '')).slice(0, 200)); }); }); page[k] = await ctx[k].newPage(); }

await check('every robot joins through the waiting-room Join now button inside the join window', async () => {
  await Promise.all(Object.keys(robots).map(k => joinViaUi(page[k], robots[k])));
  await until('waiting room', () => page.A.getByText(/waiting room|Loading your test/i).first().isVisible(), 15000);
  await shot(page.A, '01-waiting-room');
});

if (!FOCUS) {
if (!WFOCUS) {
// ----- Listening -----
const inputs = p => p.locator('.exam-engine input[type="text"]');
await until('Listening paper', () => inputs(page.A).first().isVisible(), 90000, 500).catch(async e => { for (const [k, p] of Object.entries(page)) { await shot(p, 'fatal-' + k); writeFileSync(path.join(OUT, 'fatal-' + k + '.html'), await p.content().catch(() => '')); } writeFileSync(path.join(OUT, 'server.log'), serverLog.join('').slice(-30000)); writeFileSync(path.join(OUT, 'browser.log'), browserLog.join('\n')); throw e; });
await shot(page.A, '02-listening');
await check('Robot A: answers autosave to the server within seconds (Google-Docs style)', async () => {
  await inputs(page.A).nth(0).fill('A');
  await inputs(page.A).nth(1).fill('A');
  await until('server copy', async () => { const a = (await attemptRow(robots.A)).answers['0'] || {}; return a.l0 === 'A' && a.l1 === 'A'; }, 10000);
});
await check('Robot A: offline answer stays on the device, survives closing the tab, and syncs on return', async () => {
  await ctx.A.setOffline(true);
  await inputs(page.A).nth(2).fill('A');
  await until('offline notice', () => page.A.getByText(/Offline — your answers are kept on this device/).isVisible(), 12000);
  const local = await page.A.evaluate(() => Object.entries(localStorage).filter(([k]) => k.startsWith('j9-attempt-draft:')).map(([, v]) => JSON.parse(v)));
  assert.ok(local.some(d => d.a.l2 === 'A' && d.synced === false), 'unsynced local draft with the offline answer');
  assert.equal(((await attemptRow(robots.A)).answers['0'] || {}).l2, undefined, 'server must not have it yet');
  await page.A.close();
  await ctx.A.setOffline(false);
  page.A = await ctx.A.newPage();
  await page.A.goto('/mocks/' + mockId);
  await until('restored input', async () => (await inputs(page.A).nth(2).inputValue()) === 'A', 20000);
  await until('synced after return', async () => ((await attemptRow(robots.A)).answers['0'] || {}).l2 === 'A', 15000);
});
await check('Robot A closes the browser in the middle of Listening and never returns', async () => { await ctx.A.close(); });

// ----- Reading (nobody answers; D answers one) -----
await until('Reading paper for D', () => inputs(page.D).first().isVisible().then(v => v && page.D.getByText(/Fixture passage for reading/).isVisible()), 150000, 1000);
await inputs(page.D).nth(0).fill('A');

}
// ----- Writing -----
const textarea = p => p.locator('textarea.ielts-writing-textarea');
await until('Writing paper', () => textarea(page.B).isVisible(), 150000, 1000);
await shot(page.B, '03-writing');
await check('Robot B: two typed lines are saved even though the browser is closed within a second', async () => {
  const net = [];
  page.B.on('request', r => { if (r.url().includes('/api/exam-attempts/')) net.push('req ' + r.method() + ' ' + (r.postData() || '').slice(0, 60)); });
  page.B.on('requestfinished', async r => { if (r.url().includes('/api/exam-attempts/')) net.push('done ' + r.method() + ' ' + ((await r.response())?.status())); });
  page.B.on('requestfailed', r => { if (r.url().includes('/api/exam-attempts/')) net.push('failed ' + r.method() + ' ' + r.failure()?.errorText); });
  await textarea(page.B).fill(twoLines);
  await sleep(250);
  const diag = await page.B.evaluate(() => ({ status: document.querySelector('.exam-engine [role=status], p[role=status]')?.textContent, drafts: Object.keys(localStorage).filter(k => k.startsWith('j9-attempt-draft:')).map(k => k + '=' + localStorage.getItem(k).slice(0, 80)) }));
  setTimeout(() => log('Robot B diagnostics', JSON.stringify({ diag, net })), 7000);
  await page.B.close({ runBeforeUnload: true });
  await ctx.B.close();
  await until('two lines on the server', async () => ((await attemptRow(robots.B)).answers[String(MODULES.indexOf('writing'))] || {}).writing_draft_w1 === twoLines, 8000);
});
const essay = 'Public transport in Dhaka carries millions of people every day, and the chart shows that bus use rose steadily over the decade. '.repeat(4);
await textarea(page.D).fill(essay);
await until('D essay saved', async () => ((await attemptRow(robots.D)).answers[String(MODULES.indexOf('writing'))] || {}).writing_draft_w1 === essay, 10000);

}
if (WFOCUS) { await sleep(8000); writeFileSync(path.join(OUT, 'server-wfocus.log'), serverLog.join('')); await browser.close(); server.kill('SIGTERM'); console.log(results.map(r => (r.ok ? 'PASS ' : 'FAIL ') + r.name).join('\n')); process.exit(results.every(r => r.ok) ? 0 : 1); }
// ----- Speaking (in an iframe on the same page) -----
const room = p => p.frameLocator('iframe[title="Speaking test"]');
const main = p => room(p).locator('#main-action');
async function waitAction(p, re, ms = 30000) { await until('Speaking button ' + re, async () => re.test((await main(p).textContent()) || '') && !(await main(p).isDisabled()), ms, 300); }
async function recordAnswer(p) {
  await waitAction(p, /Record answer/, 60000);
  await main(p).click();
  await sleep(2500);
  await main(p).click(); // stop
  await waitAction(p, /Save & continue/);
  await main(p).click();
}
const clips = async r => (await sql.query('SELECT step,object_key,seconds FROM public.speaking_recordings WHERE attempt_id=$1 ORDER BY step', [await attemptOf(r)]));
await until('Speaking room', () => main(page.C).isVisible(), 200000, 1000);
await shot(page.C, '04-speaking');
// Ask steps for this set: 0 = Part 1, 5 = Part 2 long turn, 6 = Part 3.
await check('Robot C: first Speaking answer uploads to private storage', async () => {
  await waitAction(page.C, /Start speaking test/);
  await main(page.C).click();
  await recordAnswer(page.C);
  await until('clip 0 saved', async () => (await clips(robots.C)).some(c => c.step === 0), 20000);
});
let firstKey;
await check('Robot C: reload resumes after the saved answer instead of restarting at Question 1', async () => {
  firstKey = (await clips(robots.C)).find(c => c.step === 0).object_key;
  await page.C.reload();
  await until('welcome back', () => room(page.C).getByText(/Welcome back/).isVisible(), 30000);
  await waitAction(page.C, /Continue speaking test/);
  await main(page.C).click();
  // Part 2 introduction → confirm → prep → long turn.
  await until('Part 2 reached', async () => /part 2/i.test(await room(page.C).locator('#question-meta').textContent() || ''), 30000);
  for (let i = 0; i < 6; i++) {
    const label = (await main(page.C).textContent()) || '';
    if (/Record answer/.test(label)) break;
    if (!(await main(page.C).isDisabled()) && /Continue|Ready to speak|Start/.test(label)) await main(page.C).click();
    await sleep(1500);
  }
});
await check('Robot C: a Speaking upload during a network drop retries by itself and saves when back online', async () => {
  await waitAction(page.C, /Record answer/, 90000);
  await main(page.C).click(); await sleep(2500); await main(page.C).click();
  await waitAction(page.C, /Save & continue/);
  await ctx.C.setOffline(true);
  await main(page.C).click();
  await sleep(2500);
  assert.ok(!(await clips(robots.C)).some(c => c.step === 5), 'not saved while offline');
  await ctx.C.setOffline(false);
  await until('clip 5 saved after reconnect', async () => (await clips(robots.C)).some(c => c.step === 5), 30000);
  const now = await clips(robots.C);
  assert.equal(now.find(c => c.step === 0).object_key, firstKey, 'Question 1 answer must not be overwritten by the reload');
});
await check('Robot C closes the browser after two Speaking answers', async () => { await ctx.C.close(); });

await check('Robot D: completes all Speaking questions and sees "submitted" at once', async () => {
  await waitAction(page.D, /Start speaking test/, 60000);
  await main(page.D).click();
  await recordAnswer(page.D);                        // Part 1
  for (let i = 0; i < 8; i++) {                       // through Part 2 intro and preparation
    const label = (await main(page.D).textContent()) || '';
    if (/Record answer/.test(label)) break;
    if (!(await main(page.D).isDisabled()) && /Continue|Ready to speak|Start/.test(label)) await main(page.D).click();
    await sleep(1500);
  }
  await recordAnswer(page.D);                        // Part 2
  await recordAnswer(page.D);                        // Part 3
  await until('submitted screen', () => page.D.getByText(/All modules submitted/).isVisible(), 60000);
  await shot(page.D, '05-submitted');
  const row = await attemptRow(robots.D);
  assert.equal(row.current_index, MODULES.length);
  assert.equal((await clips(robots.D)).length, 3);
});

await check('before publication no candidate can see marks', async () => {
  const r = await page.D.evaluate(async id => (await fetch('/api/exam-attempts/' + id, { cache: 'no-store' })).json(), await attemptOf(robots.D));
  assert.equal(r.complete, true); assert.deepEqual(r.results, []);
});

// ----- the shared clock runs out; the server does the rest without any browser -----
await sql.query("UPDATE public.mock_events SET starts_at=starts_at-interval '30 minutes',ends_at=now()-interval '5 seconds' WHERE id=$1", [mockId]);
await sql.query("UPDATE public.exam_attempts SET scheduled_start=scheduled_start-interval '30 minutes',deadline=deadline-interval '30 minutes' WHERE parent_id=$1 AND kind='mock'", [mockId]);
await check('queue worker (server only): settles every abandoned paper and evaluates Writing and Speaking', async () => {
  for (const r of Object.values(robots)) {
    const id = await attemptOf(r);
    await worker.processMockEvaluation(id, 'settle');
    await worker.processMockEvaluation(id, 'writing');
    await worker.processMockEvaluation(id, 'speaking');
  }
  for (const r of Object.values(robots)) assert.equal((await attemptRow(r)).current_index, MODULES.length, r.name + ' settled');
});
const res = async r => Object.fromEntries((await attemptRow(r)).results.map(x => [x.module, x]));
if (!FOCUS) {
await check('Robot A (closed in Listening): 3 Listening answers marked, the rest 0, published-ready', async () => {
  const x = await res(robots.A);
  assert.equal(x.listening.correct, 3); assert.equal(x.reading.correct, 0);
  assert.equal(x.writing.status, 'ai_reviewed'); assert.equal(Number(x.writing.bandScore), 0);
  assert.equal(x.speaking.status, 'ai_reviewed'); assert.equal(Number(x.speaking.bandScore), 0);
});
await check('Robot B (two lines, closed): the two lines reached the AI; band 0 with a reason; no admin block', async () => {
  const x = await res(robots.B);
  assert.ok(aiCalls.writing.some(c => c.tasks.some(t => t.answer === twoLines)));
  assert.equal(x.writing.status, 'ai_reviewed'); assert.equal(Number(x.writing.bandScore), 0); assert.match(x.writing.feedback, /too short/);
});
}
await check('Robot C (two Speaking answers, closed): both recordings evaluated on the server; unanswered score 0', async () => {
  const x = await res(robots.C);
  const call = aiCalls.speaking.find(c => c.clips.length === 2);
  assert.ok(call, 'AI got exactly the two recordings'); assert.deepEqual(call.clips.map(c => c.step), [0, 5]);
  assert.equal(x.speaking.status, 'ai_reviewed'); assert.equal(Number(x.speaking.bandScore), 4.5); assert.match(x.speaking.feedback, /2 of 3 questions answered/);
});
await check('Robot D (full paper): Writing Task 1 scored, Task 2 0; complete Speaking keeps the AI band', async () => {
  const x = await res(robots.D);
  if (!FOCUS) { assert.equal(x.reading.correct, 1); assert.equal(Number(x.writing.bandScore), 2); }
  assert.equal(Number(x.speaking.bandScore), 6.5);
});

// ----- admin review and publication over HTTP -----
const adminFetch = (p, init = {}) => fetch(ORIGIN + p, { ...init, headers: { cookie: 'luma-session=' + admin.token, origin: ORIGIN, 'content-type': 'application/json', ...(init.headers || {}) } });
await check('admin: result review is ready to publish with every paper marked', async () => {
  const r = await (await adminFetch('/api/admin/mocks/' + mockId)).json();
  assert.equal(r.participants.length, 4); assert.equal(r.readiness.ready, true, JSON.stringify(r.readiness.blockers));
});
await check('admin: can change a Writing and a Speaking band before publishing', async () => {
  const b = await attemptOf(robots.B), c = await attemptOf(robots.C);
  let r;
  if (!FOCUS) { r = await adminFetch('/api/admin/mocks/' + mockId, { method: 'POST', body: JSON.stringify({ action: 'grade', attemptId: b, band: 1, feedback: 'Reviewed by examiner: two lines only.', module: 'writing' }) });
  assert.equal(r.status, 200, await r.text()); }
  r = await adminFetch('/api/admin/mocks/' + mockId, { method: 'POST', body: JSON.stringify({ action: 'grade', attemptId: c, band: 5, feedback: 'Reviewed by examiner.', module: 'speaking' }) });
  assert.equal(r.status, 200, await r.text());
  if (!FOCUS) assert.equal(Number((await res(robots.B)).writing.bandScore), 1);
  assert.equal((await res(robots.C)).speaking.status, 'reviewed');
});
await check('admin: one click publishes all results; published marks are then locked', async () => {
  const r = await adminFetch('/api/admin/mocks/' + mockId, { method: 'POST', body: JSON.stringify({ action: 'publish' }) });
  assert.equal(r.status, 200, await r.text());
  const again = await adminFetch('/api/admin/mocks/' + mockId, { method: 'POST', body: JSON.stringify({ action: 'grade', attemptId: await attemptOf(robots.C), band: 9, feedback: 'x', module: 'speaking' }) });
  assert.equal(again.status, 409);
});
await check('candidate sees the published result page with bands and feedback', async () => {
  const p = await ctx.D.newPage();
  await p.goto('/exam/attempt/' + (await attemptOf(robots.D)));
  await until('result page', () => p.getByText(/Test complete/i).first().isVisible(), 20000);
  await until('speaking band', () => p.getByText(/Speaking band 6\.5/).isVisible(), 10000);
  await shot(p, '06-published-result');
});

// ---------- report ----------
await browser.close();
server.kill('SIGTERM');
const failed = results.filter(r => !r.ok);
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ mockId, results, aiCalls: { writing: aiCalls.writing.length, speaking: aiCalls.speaking.map(c => c.clips.map(x => x.step)) } }, null, 2));
if (failed.length) writeFileSync(path.join(OUT, 'server.log'), serverLog.join('').slice(-20000));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
await neon.close(); s3.close();
process.exit(failed.length ? 1 : 0);
