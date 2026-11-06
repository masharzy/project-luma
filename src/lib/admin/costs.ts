import 'server-only';
import { db } from '@/lib/auth/db';
import { costOfUsage, type ModelPrice } from './cost-math';

export type CostRow = { skill: 'Writing' | 'Speaking'; model: string; evaluations: number; priced: number; usd: number; audioMinutes: number };

const tokenKeys = (side: 'in' | 'out') => side === 'in'
  ? `COALESCE(NULLIF(e.usage->>'inputTokens','')::numeric,NULLIF(e.usage->>'promptTokens','')::numeric,NULLIF(e.usage->>'prompt_tokens','')::numeric,NULLIF(e.usage->>'input_tokens','')::numeric,0)`
  : `COALESCE(NULLIF(e.usage->>'outputTokens','')::numeric,NULLIF(e.usage->>'completionTokens','')::numeric,NULLIF(e.usage->>'completion_tokens','')::numeric,NULLIF(e.usage->>'output_tokens','')::numeric,0)`;

/** Per-evaluation rows for the current Dhaka month or an arbitrary window, with usage already extracted. */
async function usageRows(sinceIso: string) {
  const sql = db();
  const [w, s] = await Promise.all([
    sql.query(`SELECT e.model,${tokenKeys('in')} AS tin,${tokenKeys('out')} AS tout,0::numeric AS audio_sec,(e.usage IS NOT NULL) AS has_usage
      FROM public.writing_evaluations e WHERE e.status='completed' AND e.updated_at>=$1::timestamptz`, [sinceIso]),
    sql.query(`SELECT e.model,${tokenKeys('in')} AS tin,${tokenKeys('out')} AS tout,
      COALESCE((SELECT sum(r.seconds) FROM public.speaking_recordings r WHERE r.attempt_id=e.attempt_id),0) AS audio_sec,(e.usage IS NOT NULL) AS has_usage
      FROM public.speaking_evaluations e WHERE e.status='completed' AND e.updated_at>=$1::timestamptz`, [sinceIso]),
  ]);
  return { writing: w, speaking: s };
}

export async function loadPrices(): Promise<Record<string, ModelPrice>> {
  const rows = await db().query('SELECT model,input_usd_per_m,output_usd_per_m,audio_usd_per_min,source_note,verified_on::text FROM public.ai_model_prices ORDER BY model');
  return Object.fromEntries(rows.map(r => [r.model, { model: r.model, inputPerM: r.input_usd_per_m === null ? null : Number(r.input_usd_per_m), outputPerM: r.output_usd_per_m === null ? null : Number(r.output_usd_per_m), audioPerMin: r.audio_usd_per_min === null ? null : Number(r.audio_usd_per_min), note: r.source_note, verifiedOn: r.verified_on }]));
}
export async function loadBudget() {
  const r = (await db().query('SELECT usd_bdt_rate,monthly_cap_bdt,alert_percent FROM public.ai_budget WHERE id=true'))[0] ?? {};
  return { rate: r.usd_bdt_rate === null || r.usd_bdt_rate === undefined ? null : Number(r.usd_bdt_rate), capBdt: r.monthly_cap_bdt ?? null, alertPercent: Number(r.alert_percent ?? 80) };
}

export async function costSummary(sinceIso: string) {
  const [prices, budget, rows] = await Promise.all([loadPrices(), loadBudget(), usageRows(sinceIso)]);
  const out: CostRow[] = [];
  const unpricedModels = new Set<string>();
  for (const [skill, list] of [['Writing', rows.writing], ['Speaking', rows.speaking]] as const) {
    const byModel = new Map<string, CostRow>();
    for (const r of list) {
      const model = String(r.model);
      const row = byModel.get(model) ?? { skill, model, evaluations: 0, priced: 0, usd: 0, audioMinutes: 0 };
      row.evaluations += 1; row.audioMinutes += Number(r.audio_sec) / 60;
      const c = costOfUsage({ inputTokens: Number(r.tin), outputTokens: Number(r.tout), audioSeconds: Number(r.audio_sec) }, prices[model]);
      if (c === null) unpricedModels.add(model); else { row.priced += 1; row.usd += c; }
      byModel.set(model, row);
    }
    out.push(...byModel.values());
  }
  return { rows: out, prices, budget, unpricedModels: [...unpricedModels] };
}
