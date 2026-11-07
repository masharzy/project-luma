import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const src = fs.readFileSync(new URL('../src/lib/plan-access.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = await import('data:text/javascript;base64,' + Buffer.from(js.replace("from 'zod'", "from '" + new URL('../node_modules/zod/index.js', import.meta.url).href + "'")).toString('base64'));
const { durationLabel, planCoversTest, normalizeAccess, accessLines, everything, nothing } = mod;

test('duration labels follow the plan, not a fixed month', () => {
  assert.equal(durationLabel(30), '1 month'); assert.equal(durationLabel(90), '3 months');
  assert.equal(durationLabel(180), '6 months'); assert.equal(durationLabel(365), '1 year'); assert.equal(durationLabel(45), '45 days');
});
test('a plan without access data keeps unlocking everything; broken data unlocks nothing', () => {
  assert.deepEqual(normalizeAccess(null), everything);
  assert.deepEqual(normalizeAccess({ recent: 'yes' }), nothing);
});
test('Cambridge and More Books follow the chosen books', () => {
  const a = { ...nothing, cambridge: { mode: 'some', items: ['12'] }, moreBooks: { mode: 'some', items: ['collins-1'] } };
  const none = new Set();
  assert.equal(planCoversTest(a, { kind: 'cambridge', id: '1', book: '12' }, none), true);
  assert.equal(planCoversTest(a, { kind: 'cambridge', id: '2', book: '13' }, none), false);
  assert.equal(planCoversTest(a, { kind: 'practice', id: '3', book: 'collins-1' }, none), true);
  assert.equal(planCoversTest(a, { kind: 'practice', id: '4', book: 'barrons' }, none), false);
});
test('Recent Tests by number keep tests already opened and stop at the limit', () => {
  const a = { ...nothing, recent: { mode: 'count', count: 2 } };
  const t = id => ({ kind: 'practice', id, book: null });
  assert.equal(planCoversTest(a, t('9'), new Set(['1'])), true);
  assert.equal(planCoversTest(a, t('9'), new Set(['1', '2'])), false);
  assert.equal(planCoversTest(a, t('2'), new Set(['1', '2'])), true);
  assert.equal(planCoversTest(nothing, t('1'), new Set()), false);
});
test('pricing lines say what is included and what is not', () => {
  const lines = accessLines({ ...nothing, recent: { mode: 'count', count: 5 }, grammar: true });
  assert.deepEqual(lines.find(l => l.label === 'Recent Tests'), { label: 'Recent Tests', value: '5', on: true });
  assert.equal(lines.find(l => l.label === 'E-book shelf').on, false);
  assert.equal(lines.find(l => l.label === 'Grammar').on, true);
});
