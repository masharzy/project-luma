// Production smoke run of a scheduled mock on https://jumptonine.com with three QA robot candidates and a QA admin.
// Real queue, real R2 uploads, real AI Writing and Speaking evaluation. Run from GitHub Actions (public internet).
// Session tokens are created here and never printed: only their SHA-256 hashes are logged, so an operator can
// attach them to the pre-created QA users in the database. Hashes cannot be turned back into tokens.
import { randomBytes, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
const BASE = process.env.PROD_BASE || 'https://jumptonine.com';
const cfg = JSON.parse(readFileSync(new URL('./prod-mock-robot.json', import.meta.url), 'utf8'));
const MOCK = String(cfg.mockId);
const OUT = new URL('./output/', import.meta.url); mkdirSync(OUT, { recursive: true });
const report = { mockId: MOCK, steps: [] };
const log = (...a) => { const line = new Date().toISOString().slice(11, 19) + ' ' + a.join(' '); console.log(line); report.steps.push(line); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const save = () => writeFileSync(new URL('prod-report.json', OUT), JSON.stringify(report, null, 2));
process.on('exit', save);

const who = ['A', 'C', 'D', 'ADMIN'];
// Step 1 (--init): create tokens in a runner-local file and publish only their hashes (as an annotation, visible when the step ends).
const tokenFile = (process.env.RUNNER_TEMP || '/tmp') + '/qa-tokens.json';
if (process.argv.includes('--init')) {
  const t = Object.fromEntries(who.map(k => [k, randomBytes(32).toString('base64url')]));
  writeFileSync(tokenFile, JSON.stringify(t), { mode: 0o600 });
  const hashes = JSON.stringify(Object.fromEntries(who.map(k => [k, createHash('sha256').update(t[k]).digest('hex')])));
  writeFileSync((process.env.RUNNER_TEMP || '/tmp') + '/qa-hashes.json', hashes);
  console.log('SESSION_HASHES ' + hashes);
  process.exit(0);
}
const token = JSON.parse(readFileSync(tokenFile, 'utf8'));
async function api(k, path, body, raw = false) {
  const r = await fetch(BASE + path, { method: body === undefined ? 'GET' : 'POST', headers: { cookie: '__Host-luma-session=' + token[k], origin: BASE, ...(body instanceof Uint8Array ? { 'content-type': 'audio/wav' } : body !== undefined ? { 'content-type': 'application/json' } : {}) }, body: body instanceof Uint8Array ? body : body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
  if (raw) return r;
  const text = await r.text(); let data; try { data = JSON.parse(text); } catch { data = { text: text.slice(0, 200) }; }
  return { status: r.status, data };
}
async function until(what, fn, ms, every = 5000) { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn().catch(() => null); if (v) return v; await sleep(every); } throw Error('Timed out: ' + what); }

// ---- speech for the Speaking answers (gTTS, fallback espeak-ng), 16 kHz mono WAV ----
const answers = cfg.speakingAnswers;
function speech(i, text) {
  const mp3 = new URL(`a${i}.mp3`, OUT).pathname, wav = new URL(`a${i}.wav`, OUT).pathname;
  if (!existsSync(wav)) {
    try { execFileSync('gtts-cli', [text, '--lang', 'en', '--tld', 'co.uk', '--output', mp3]); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp3, '-ac', '1', '-ar', '16000', '-sample_fmt', 's16', wav]); }
    catch { execFileSync('espeak-ng', ['-v', 'en-gb', '-s', '150', '-w', mp3 + '.wav', text]); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp3 + '.wav', '-ac', '1', '-ar', '16000', '-sample_fmt', 's16', wav]); }
  }
  return new Uint8Array(readFileSync(wav));
}
answers.forEach((t, i) => speech(i, t));
log('speech ready', answers.length, 'clips');

await until('QA sessions to be attached', async () => { for (const k of who) { const r = await api(k, '/api/mocks/' + MOCK); if (!r.data.signedIn) return false; } return (await api('ADMIN', '/api/admin/mocks/' + MOCK)).status === 200; }, 20 * 60000, 10000);
log('sessions active');

let r = await api('ADMIN', '/api/admin/mocks/' + MOCK, { action: 'prepare' });
log('admin prepare', r.status, JSON.stringify(r.data));
let ev = (await api('A', '/api/mocks/' + MOCK)).data;
log('mock', ev.title, 'starts', ev.startsAt, 'ends', ev.endsAt, 'modules', ev.modules.map(m => m.module + ':' + m.minutes).join(','));
for (const k of ['A', 'C', 'D']) { r = await api(k, '/api/mocks/' + MOCK, { action: 'register' }); log('register', k, r.status); }

await until('join window', async () => { ev = (await api('A', '/api/mocks/' + MOCK)).data; return ev.serverNow >= new Date(ev.startsAt).getTime() + 2000; }, 15 * 60000, 3000);
const attempt = {};
for (const k of ['A', 'C', 'D']) { r = await api(k, '/api/mocks/' + MOCK, { action: 'join' }); attempt[k] = r.data.attemptId; log('join', k, r.status, r.data.attemptId ? 'ok' : JSON.stringify(r.data)); }
report.attempts = attempt;

const state = async k => (await api(k, '/api/exam-attempts/' + attempt[k])).data;
const at = (k, index) => until(k + ' module ' + index + ' open', async () => { const s = await state(k); return s.index === index && s.current ? s : null; }, 30 * 60000, 3000);
async function saveAnswers(k, index, ans) { const res = await api(k, '/api/exam-attempts/' + attempt[k], { action: 'save', index, answers: ans }); log('save', k, 'module', index, res.status, JSON.stringify(res.data)); return res; }
async function roomSteps(k) { const res = await api(k, '/speaking/evaluation/' + attempt[k], undefined, true); const html = await res.text(); const m = html.match(/const ROOM=(\{.*?\});\n/s); if (!m) throw Error('Speaking room did not render (' + res.status + ')'); return JSON.parse(m[1]).steps; }
async function upload(k, step, bytes) { for (let i = 0; i < 4; i++) { const res = await api(k, `/api/products/speaking/recording/${attempt[k]}?step=${step}`, bytes); log('upload', k, 'step', step, res.status, JSON.stringify(res.data)); if (res.status === 200) return true; await sleep(3000); } return false; }

const robotA = (async () => { // answers two Listening questions, then the browser is gone for good
  await at('A', 0);
  await saveAnswers('A', 0, { l0: cfg.listeningCorrect, l1: cfg.listeningCorrect, l2: 'wrong' });
  log('A abandons in Listening');
})();
const robotD = (async () => { // full paper, submits Speaking early
  await at('D', 1); await saveAnswers('D', 1, { r0: cfg.readingCorrect });
  await at('D', 2);
  await saveAnswers('D', 2, { writing_draft_w1: cfg.writing.task1 });
  await saveAnswers('D', 2, { writing_draft_w1: cfg.writing.task1, writing_draft_w2: cfg.writing.task2 });
  await at('D', 3);
  const asks = (await roomSteps('D')).map((s, i) => ({ ...s, i })).filter(s => s.t === 'ask');
  log('D speaking asks', asks.length);
  for (const [n, s] of asks.entries()) await upload('D', s.i, speech(Math.min(n, answers.length - 1), answers[Math.min(n, answers.length - 1)]));
  const sub = await api('D', '/api/mocks/speaking/' + attempt.D, {});
  log('D submit speaking', sub.status, JSON.stringify(sub.data));
  const s = await state('D'); log('D after submit: complete=' + s.complete + ' resultsVisible=' + (s.results || []).length);
})();
const robotC = (async () => { // records two answers (Part 1 Q1 and the Part 2 long turn), then closes the browser
  await at('C', 3);
  const steps = (await roomSteps('C')).map((s, i) => ({ ...s, i })).filter(s => s.t === 'ask');
  await upload('C', steps[0].i, speech(0, answers[0]));
  const long = steps.find(s => s.long) || steps[1];
  await upload('C', long.i, speech(2, answers[2]));
  log('C abandons after two Speaking answers');
})();
await Promise.all([robotA, robotD, robotC]);

// ---- the server alone finishes the papers and runs the AI ----
ev = (await api('A', '/api/mocks/' + MOCK)).data;
log('waiting for the mock to end at', ev.endsAt);
await until('mock end', async () => (await api('A', '/api/mocks/' + MOCK)).data.serverNow > new Date(ev.endsAt).getTime() + 5000, 40 * 60000, 15000);
let review;
const summary = rv => rv.participants.map(p => ({ name: p.name, index: p.current_index, results: (p.results || []).map(x => ({ module: x.module, status: x.status, correct: x.correct, total: x.total, band: x.bandScore, aiBand: x.aiBand, model: x.aiModel, feedback: String(x.feedback || '').slice(0, 160), aiError: x.aiError ? 'yes' : undefined })) }));
await until('every paper evaluated on the server', async () => {
  review = (await api('ADMIN', '/api/admin/mocks/' + MOCK)).data;
  log('readiness:', review.readiness?.summary, JSON.stringify(review.readiness?.blockers?.map(b => b.candidate.slice(0, 12) + ' ' + b.module + ' ' + b.reason.slice(0, 40))));
  return review.readiness?.ready;
}, 15 * 60000, 30000).catch(e => log(e.message));
report.beforePublish = summary(review);
console.log(JSON.stringify(report.beforePublish, null, 1));

if (review.readiness?.ready) {
  r = await api('ADMIN', '/api/admin/mocks/' + MOCK, { action: 'grade', attemptId: attempt.A, band: 0.5, feedback: 'QA reviewer: changed by admin before publishing.', module: 'writing' });
  log('admin edits A writing band', r.status, JSON.stringify(r.data));
  r = await api('ADMIN', '/api/admin/mocks/' + MOCK, { action: 'publish' });
  log('admin publish', r.status, JSON.stringify(r.data));
  for (const k of ['A', 'C', 'D']) { const s = await state(k); log('candidate', k, 'sees', (s.results || []).map(x => x.module + '=' + (x.total !== null ? x.correct + '/' + x.total : x.bandScore)).join(' ')); }
  report.published = true;
} else {
  report.published = false;
  process.exitCode = 1;
}
