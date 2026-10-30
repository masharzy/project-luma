import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const native = createRequire(import.meta.url);

function harness() {
  const calls = [];
  const ownerId = '00000000-0000-4000-8000-000000000001';
  const docs = {
    listening: { durationMinutes: 30, parts: [{ id: 'p1' }], questions: [{ id: 'q1' }] },
    reading: { durationMinutes: 60, parts: [{ id: 'p2' }], questions: [{ id: 'q2' }] },
    writing: { durationMinutes: 60, parts: [{ id: 'p3' }], questions: [] },
  };
  let row = null;
  const query = async (sql, args) => {
    calls.push({ sql, args });
    if (sql.includes('SELECT monthly_limit')) return [{ monthly_limit: 5 }];
    if (sql.includes('SELECT COALESCE(SUM(count)')) return [{ used: 0 }];
    if (sql.includes('INSERT INTO public.exam_attempts')) {
      row = { id: args[0], kind: args[2], parent_id: args[3], title: args[4],
        snapshot: JSON.parse(args[5]), user_id: args[6], current_index: 0,
        deadline: new Date(Date.now() + args[7] * 1000).toISOString(), results: [], answers: {} };
      return [];
    }
    if (sql.includes('SELECT a.*')) return row ? [row] : [];
    if (sql.includes('SET current_index=current_index+1')) {
      row.answers[String(row.current_index)] = JSON.parse(args[3]);
      row.results.push(...JSON.parse(args[2]));
      row.current_index += 1;
      row.deadline = row.current_index < row.snapshot.length
        ? new Date(Date.now() + args[5] * 1000).toISOString() : null;
      return [{id:row.id}];
    }
    throw Error('Unexpected SQL in seamless-flow test: ' + sql);
  };
  class AuthHttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const mocks = {
    'server-only': {},
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'owner-token' }) }) },
    '@/lib/auth/session': { readSession: async () => ({ user: { id: ownerId } }) },
    '@/lib/auth/db': { db: () => ({ query }) },
    '@/lib/auth/crypto': { digest: () => 'owner-hash', randomToken: () => 'owner-token', validToken: () => true },
    '@/lib/auth/http': { AuthHttpError },
    '@/lib/cambridge-settings': {
      moduleOrder: ['listening', 'reading', 'writing'],
      selectedModules: (_modules, selection) => selection === 'full' ? ['listening', 'reading', 'writing'] : [selection],
    },
    './store': {
      examParent: async () => ({ title: 'Cambridge 1 Test 1', status: 'published', access: 'free', modules: ['listening', 'reading', 'writing'] }),
      loadExam: async (_kind, _id, module) => ({ document: docs[module], revision: 1 }),
      learnerDocument: document => document,
    },
    './timeline': (()=>{const src=readFileSync(new URL('../src/lib/exam/timeline.ts',import.meta.url),'utf8');const m={exports:{}};new Function('require','module','exports',ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(native,m,m.exports);return m.exports;})(),
    './result': { gradeModule: module => ({ module, total: 40, correct: 32, items: [], bandScore: 7, scorePercent: 80 }) },
  };
  const file = readFileSync(new URL('../src/lib/exam/attempts.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(file, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const m = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((name) => Object.hasOwn(mocks, name) ? mocks[name] : native(name), m, m.exports);
  return { api: m.exports, calls, ownerId, get row() { return row; } };
}

test('Begin Practice creates an attempt with Listening already timed, without a second Start screen', async () => {
  const h = harness();
  const id = await h.api.startAttempt('cambridge', '1', 'full', 'owner-token', h.ownerId);
  const created = h.calls.find(call => call.sql.includes('INSERT INTO public.exam_attempts'));
  assert.match(created.sql, /snapshot,user_id,deadline/);
  assert.equal(created.args[7], 30 * 60);
  assert.equal(h.row.current_index, 0);
  assert.ok(h.row.deadline);
  const first = h.api.publicAttempt(h.row);
  assert.equal(first.current.module, 'listening');
  assert.equal(first.complete, false);
  assert.equal(first.modules.length, 3);
  assert.equal(id, h.row.id);
});

test('Listening submission starts Reading in the same atomic database update, with no readiness screen', async () => {
  const h = harness();
  const id = await h.api.startAttempt('cambridge', '1', 'full', 'owner-token', h.ownerId);
  const reading = await h.api.advanceAttempt(id, { action: 'submit', index: 0, answers: { q1: 'A' } });
  const transition = h.calls.find(call => call.sql.includes('SET current_index=current_index+1'));
  assert.match(transition.sql, /deadline=CASE WHEN current_index\+1<\$5::integer/);
  assert.equal(transition.args[4], 3);
  assert.equal(transition.args[5], 60 * 60);
  assert.equal(reading.current.module, 'reading');
  assert.ok(reading.deadline);
  assert.equal(reading.index, 1);
  const writing = await h.api.advanceAttempt(id, { action: 'submit', index: 1, answers: { q2: 'B' } });
  assert.equal(writing.current.module, 'writing');
  const finished = await h.api.advanceAttempt(id, { action: 'submit', index: 2, answers: { writing_draft_p3: 'Writing answer' } });
  assert.equal(finished.complete, true);
  assert.equal(finished.deadline, null);
  assert.equal(finished.results.length, 3);
});
