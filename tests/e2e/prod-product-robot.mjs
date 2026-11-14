// Production QA run on https://jumptonine.com with one free-plan QA learner:
//  1. key pages respond (public and signed in)
//  2. guest practice: start Cambridge Reading, save, submit, see marks
//  3. standalone AI Writing: Cambridge task list → submit both tasks → evaluation saved (latency, cost)
//  4. standalone AI Speaking: Speaking Studio test → room → upload every answer → evaluate → saved feedback
// Tokens stay on the runner; only their SHA-256 hashes are published (see the workflow).
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
const BASE = 'https://jumptonine.com';
const cfg = JSON.parse(readFileSync(new URL('./prod-product-robot.json', import.meta.url), 'utf8'));
const OUT = new URL('./output/', import.meta.url); mkdirSync(OUT, { recursive: true });
const report = { steps: [], checks: [] };
const log = (...a) => { const l = new Date().toISOString().slice(11, 19) + ' ' + a.join(' '); console.log(l); report.steps.push(l); };
const ok = (name, pass, detail = '') => { report.checks.push({ name, pass, detail }); log(pass ? 'PASS' : 'FAIL', name, detail); if (!pass) process.exitCode = 1; };
process.on('exit', () => writeFileSync(new URL('prod-product-report.json', OUT), JSON.stringify(report, null, 2)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tokenFile = (process.env.RUNNER_TEMP || '/tmp') + '/qa-product-token.json';
if (process.argv.includes('--init')) {
  const t = randomBytes(32).toString('base64url');
  writeFileSync(tokenFile, JSON.stringify(t), { mode: 0o600 });
  const h = JSON.stringify({ P: createHash('sha256').update(t).digest('hex') });
  writeFileSync((process.env.RUNNER_TEMP || '/tmp') + '/qa-hashes.json', h); console.log('SESSION_HASHES ' + h); process.exit(0);
}
const token = JSON.parse(readFileSync(tokenFile, 'utf8'));
let guestCookie = '';
async function api(path, body, { auth = true, raw = false, type } = {}) {
  const headers = { origin: BASE, cookie: auth ? '__Host-luma-session=' + token : guestCookie };
  if (body instanceof Uint8Array) headers['content-type'] = 'audio/wav'; else if (body !== undefined) headers['content-type'] = type || 'application/json';
  const t0 = Date.now();
  const r = await fetch(BASE + path, { method: body === undefined ? 'GET' : 'POST', headers, body: body instanceof Uint8Array ? body : body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
  if (!auth) { const sc = r.headers.getSetCookie?.() || []; for (const c of sc) { const kv = c.split(';')[0]; if (!guestCookie.includes(kv.split('=')[0] + '=')) guestCookie += (guestCookie ? '; ' : '') + kv; } }
  if (raw) return r;
  const text = await r.text(); let data; try { data = JSON.parse(text); } catch { data = { text: text.slice(0, 160) }; }
  return { status: r.status, data, ms: Date.now() - t0 };
}

// ---- speech ----
function speech(i, text) {
  const mp3 = new URL(`s${i}.mp3`, OUT).pathname, wav = new URL(`s${i}.wav`, OUT).pathname;
  if (!existsSync(wav)) {
    const conv = src => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', '-ac', '1', '-ar', '16000', '-sample_fmt', 's16', wav]);
    try { execFileSync('gtts-cli', [text, '--lang', 'en', '--tld', 'co.in', '--output', mp3]); conv(mp3); }
    catch { execFileSync('espeak-ng', ['-v', 'en-gb', '-s', '150', '-w', mp3 + '.wav', text]); conv(mp3 + '.wav'); }
  }
  const b = readFileSync(wav); if (b.toString('ascii', 36, 40) !== 'data') throw Error('bad WAV header');
  return new Uint8Array(b);
}
cfg.speaking.answers.forEach((t, i) => speech(i, t));
log('speech ready', cfg.speaking.answers.length);

// wait for the operator to attach the session
for (let i = 0; i < 120; i++) { const s = await api('/api/products/writing/tasks'); if (s.status === 200) break; await sleep(10000); }
log('session active');

// ---- 1. pages ----
for (const [path, auth] of cfg.pages) {
  const r = await api(path, undefined, { auth, raw: true });
  ok(`page ${path}${auth ? ' (signed in)' : ''}`, r.status === 200, String(r.status));
}

// ---- 2. guest practice ----
{
  let r = await api('/api/exam-attempts', { kind: 'cambridge', parentId: cfg.practice.testId, selection: 'reading' }, { auth: false });
  ok('guest practice: start Cambridge Reading', r.status === 201, r.status + ' ' + JSON.stringify(r.data).slice(0, 120));
  const id = r.data.id;
  if (id) {
    let s = await api('/api/exam-attempts/' + id, undefined, { auth: false });
    const qs = (s.data.current?.document?.questions || []).slice(0, 3);
    r = await api('/api/exam-attempts/' + id, { action: 'start', index: 0 }, { auth: false });
    const answers = Object.fromEntries(qs.map(q => [q.id, 'test']));
    r = await api('/api/exam-attempts/' + id, { action: 'save', index: 0, answers }, { auth: false });
    ok('guest practice: answers save', r.status === 200, String(r.status));
    r = await api('/api/exam-attempts/' + id, { action: 'submit', index: 0, answers }, { auth: false });
    s = await api('/api/exam-attempts/' + id, undefined, { auth: false });
    const res = s.data.results?.[0];
    ok('guest practice: submitted and marked', s.data.complete === true && res && res.total > 0, res ? `${res.correct}/${res.total}` : JSON.stringify(s.data).slice(0, 120));
  }
}

// ---- 3. standalone AI Writing ----
{
  let r = await api('/api/products/writing/tasks?test=' + cfg.writing.test);
  const tasks = r.data.tasks || [];
  ok('writing: Cambridge tasks load', r.status === 200 && tasks.length === 2, r.status + ' tasks=' + tasks.length);
  const input = { tasks: tasks.map(t => ({ task: t.task, question: t.question, image: t.task === 1 ? t.image : null, answer: cfg.writing['task' + t.task] })) };
  const submissionId = randomUUID(), t0 = Date.now();
  r = await api('/api/products/writing', { submissionId, input });
  ok('writing: submission accepted', r.status === 202, r.status + ' ' + JSON.stringify(r.data).slice(0, 160));
  let job;
  for (let i = 0; i < 60 && r.status === 202; i++) { await sleep(5000); job = (await api('/api/products/writing?submissionId=' + submissionId)).data.evaluation; if (job && ['completed', 'failed'].includes(job.status)) break; }
  const secs = Math.round((Date.now() - t0) / 1000);
  report.writing = { status: job?.status, seconds: secs, model: job?.model, band: job?.result?.estimatedBand, tasks: job?.result?.tasks?.map(t => ({ task: t.task, scorable: t.scorable, bands: [t.taskAchievement?.band, t.coherence?.band, t.lexicalResource?.band, t.grammar?.band], corrections: t.corrections?.length })) };
  ok('writing: evaluation completed and saved', job?.status === 'completed' && job.result?.estimatedBand != null, JSON.stringify(report.writing));
}

// ---- 4. standalone AI Speaking ----
{
  let r = await api('/api/products/speaking/attempts', { testId: cfg.speaking.setId });
  ok('speaking: Studio test starts', r.status === 201, r.status + ' ' + JSON.stringify(r.data).slice(0, 120));
  const id = r.data.id;
  if (id) {
    const page = await api('/speaking/evaluation/' + id, undefined, { raw: true });
    const html = await page.text(); const m = html.match(/const ROOM=(\{.*?\});\n/s);
    ok('speaking: room renders', page.status === 200 && !!m, String(page.status));
    const asks = m ? JSON.parse(m[1]).steps.map((s, i) => ({ ...s, i })).filter(s => s.t === 'ask') : [];
    report.speakingQuestions = asks.map(a => a.q?.slice(0, 80));
    let saved = 0;
    for (const [n, a] of asks.entries()) {
      const clip = speech(Math.min(n, cfg.speaking.answers.length - 1), cfg.speaking.answers[Math.min(n, cfg.speaking.answers.length - 1)]);
      for (let k = 0; k < 3; k++) { const u = await api(`/api/products/speaking/recording/${id}?step=${a.i}`, clip); if (u.status === 200) { saved++; break; } log('upload retry', a.i, u.status, JSON.stringify(u.data)); await sleep(2000); }
    }
    ok('speaking: every answer uploaded', saved === asks.length && saved > 0, `${saved}/${asks.length}`);
    const t0 = Date.now();
    r = await api('/api/products/speaking/evaluate', { attemptId: id });
    ok('speaking: evaluation queued', r.status === 202, r.status + ' ' + JSON.stringify(r.data).slice(0, 160));
    let job;
    for (let i = 0; i < 72; i++) { await sleep(5000); job = (await api('/api/products/speaking/evaluate?attemptId=' + id)).data.evaluation; if (job && ['completed', 'failed'].includes(job.status)) break; }
    const res = job?.result;
    report.speaking = { status: job?.status, error: job?.error_code, seconds: Math.round((Date.now() - t0) / 1000), band: res?.estimatedBand, criteria: res ? [res.fluency?.band, res.lexicalResource?.band, res.grammar?.band, res.pronunciation?.band] : null, transcripts: res?.transcripts?.length, questions: asks.length };
    ok('speaking: evaluation completed with all four criteria and a transcript per question', job?.status === 'completed' && res?.estimatedBand != null && report.speaking.criteria.every(b => b != null) && res.transcripts?.length === asks.length, JSON.stringify(report.speaking));
  }
}
log('done', report.checks.filter(c => c.pass).length + '/' + report.checks.length);
