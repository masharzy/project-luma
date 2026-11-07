#!/usr/bin/env node
// Writing evaluation stress test using the PRODUCTION prompt + validation.
//   OPENROUTER_API_KEY=... node scripts/ai-lab/writing-stress.mjs [--model z-ai/glm-4.7-flash] [--runs 2] [--mock]
// --mock needs no network: it feeds synthetic model output through the real validation to test this harness.
// Raw responses go to scripts/ai-lab/results/<model>-<timestamp>/. The API key is never written anywhere.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { writingSystemPrompt, assessmentPromptVersion } from '../../src/lib/evaluation/prompts.ts';
import { writingAssessmentSchema, finalizeAssessment } from '../../src/lib/evaluation/schema.ts';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : (process.argv[i + 1]?.startsWith('--') || process.argv[i + 1] === undefined ? true : process.argv[i + 1]); };
const model = arg('model', 'z-ai/glm-4.7-flash');
const runs = Number(arg('runs', 2));
const mock = Boolean(arg('mock', false));
const key = process.env.OPENROUTER_API_KEY;
if (!mock && !key) { console.error('Set OPENROUTER_API_KEY (or use --mock).'); process.exit(1); }
const cases = JSON.parse(readFileSync(join(here, 'writing-stress-cases.json'), 'utf8'));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = join(here, 'results', `${model.replace(/\//g, '_')}${mock ? '-mock' : ''}-${stamp}`);
mkdirSync(outDir, { recursive: true });
const system = writingSystemPrompt + `\nRequired JSON schema: ${JSON.stringify(z.toJSONSchema(writingAssessmentSchema))}`;

function mockOutput(c) {
  const e = c.expect, mid = e.min != null ? (e.min + e.max) / 2 : (e.max ?? 4) - 0.5, b = Math.round(mid * 2) / 2;
  const crit = () => ({ band: b, evidence: [], feedback: 'mock' });
  return { tasks: [{ task: c.task, scorable: !(e.orUnscorable && c.id !== 'banglish'), limitation: '', taskAchievement: crit(), coherence: crit(), lexicalResource: crit(), grammar: crit(), corrections: [{ original: c.answer.split(/\s+/).slice(0, 3).join(' '), improved: 'x', reason: 'mock' }], nextSteps: [] }], summary: 'mock' };
}

async function call(c) {
  const body = {
    model, max_tokens: 4000, temperature: 0, usage: { include: true },
    response_format: { type: 'json_object' },
    reasoning: { enabled: false }, provider: { allow_fallbacks: false, require_parameters: true },
    messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify({ tasks: [{ task: c.task, question: c.question, answer: c.answer, imageAttached: false }] }) }],
  };
  const t0 = Date.now();
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  const ms = Date.now() - t0;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ms, httpStatus: res.status, error: String(json?.error?.message || 'http error').replaceAll(key, '[redacted]').slice(0, 300) };
  return { ms, text: json.choices?.[0]?.message?.content ?? '', usage: json.usage ?? null, servedBy: json.provider ?? null, model: json.model ?? null };
}

function judge(c, a) {
  const e = c.expect, fails = [], t = a.tasks[0], overall = a.estimatedBand;
  if (overall == null) { if (!e.orUnscorable) fails.push('unexpectedly unscorable'); return fails; }
  if (e.min != null && overall < e.min) fails.push(`overall ${overall} < ${e.min}`);
  if (e.max != null && overall > e.max) fails.push(`overall ${overall} > ${e.max}`);
  if (e.taMax != null && t.taskAchievement.band > e.taMax) fails.push(`TR ${t.taskAchievement.band} > ${e.taMax}`);
  if (e.lrMax != null && t.lexicalResource.band > e.lrMax) fails.push(`LR ${t.lexicalResource.band} > ${e.lrMax}`);
  if (e.graMax != null && t.grammar.band > e.graMax) fails.push(`GRA ${t.grammar.band} > ${e.graMax}`);
  return fails;
}

const rows = [];
for (const c of cases) for (let r = 1; r <= runs; r++) {
  const id = `${c.id}#${r}`;
  const input = { tasks: [{ task: c.task, question: c.question, answer: c.answer, image: null }] };
  let row = { id, case: c.id, run: r, label: c.label };
  try {
    let raw;
    if (mock) raw = { ms: 0, text: JSON.stringify(mockOutput(c)), usage: null };
    else raw = await call(c);
    writeFileSync(join(outDir, `${id}.raw.json`), JSON.stringify({ ...raw, system: undefined }, null, 1));
    Object.assign(row, { ms: raw.ms, httpStatus: raw.httpStatus, costUsd: raw.usage?.cost ?? null, inTok: raw.usage?.prompt_tokens ?? null, outTok: raw.usage?.completion_tokens ?? null });
    if (raw.error) { row.status = 'API_ERROR'; row.detail = raw.error; }
    else {
      let parsed;
      try { parsed = JSON.parse(raw.text.replace(/^\s*```(?:json)?\s*/, '').replace(/\s*```\s*$/, '')); } catch { row.status = 'BAD_JSON'; row.detail = raw.text.slice(0, 120); }
      if (parsed) {
        try {
          const a = finalizeAssessment(parsed, input);
          const t = a.tasks[0];
          Object.assign(row, { overall: a.estimatedBand, scorable: t.scorable, TR: t.taskAchievement.band, CC: t.coherence.band, LR: t.lexicalResource.band, GRA: t.grammar.band, corrections: t.corrections.length });
          const fails = judge(c, a);
          row.status = fails.length ? 'FAIL' : 'PASS'; row.detail = fails.join('; ') || (t.limitation || '');
        } catch (e) { row.status = 'INVALID'; row.detail = String(e.message).slice(0, 160); }
      }
    }
  } catch (e) { row.status = 'ERROR'; row.detail = String(e.message).replaceAll(key || '\0', '[redacted]').slice(0, 200); }
  rows.push(row);
  console.log(`${row.status.padEnd(9)} ${id.padEnd(34)} overall=${row.overall ?? '-'} TR=${row.TR ?? '-'} CC=${row.CC ?? '-'} LR=${row.LR ?? '-'} GRA=${row.GRA ?? '-'} ${row.ms ?? 0}ms ${row.detail ?? ''}`);
}

// Consistency across runs of the same case
const byCase = {};
for (const r of rows) (byCase[r.case] ??= []).push(r);
const spread = Object.entries(byCase).map(([k, v]) => { const o = v.map(x => x.overall).filter(x => x != null); return { case: k, spread: o.length > 1 ? Math.max(...o) - Math.min(...o) : null }; });
const ok = rows.filter(r => r.status === 'PASS').length;
const lat = rows.map(r => r.ms).filter(Boolean).sort((a, b) => a - b);
const cost = rows.reduce((n, r) => n + (r.costUsd || 0), 0);
const summary = {
  model, mock, promptVersion: assessmentPromptVersion, runsPerCase: runs, total: rows.length, pass: ok,
  invalidOrBadJson: rows.filter(r => ['INVALID', 'BAD_JSON'].includes(r.status)).length, apiErrors: rows.filter(r => ['API_ERROR', 'ERROR'].includes(r.status)).length,
  latencyMs: lat.length ? { median: lat[Math.floor(lat.length / 2)], p95: lat[Math.min(lat.length - 1, Math.floor(lat.length * 0.95))] } : null,
  avgCostUsdPerEval: rows.some(r => r.costUsd != null) ? cost / rows.filter(r => r.costUsd != null).length : null,
  maxScoreSpreadAcrossRuns: Math.max(0, ...spread.map(s => s.spread ?? 0)), rows,
};
writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 1));
console.log(`\n${ok}/${rows.length} passed | invalid/bad-json ${summary.invalidOrBadJson} | api errors ${summary.apiErrors} | median ${summary.latencyMs?.median ?? '-'}ms | avg cost $${summary.avgCostUsdPerEval?.toFixed(5) ?? '-'} | max spread ${summary.maxScoreSpreadAcrossRuns}\nResults: ${outDir}`);
