import { requireAdmin } from '@/lib/auth/guards';
import { WorkspaceHeading } from '@/components/page-parts';
import { db } from '@/lib/auth/db';
import { costSummary } from '@/lib/admin/costs';
import { bdt, planWorstCase } from '@/lib/admin/cost-math';
import { savePrice, deletePrice, saveBudget } from '@/lib/admin/cost-actions';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cost & usage' };
const fmt = (n: number | null, d = 0) => n === null ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
export default async function Page({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin();
  const days = [7, 30, 90].includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const monthStart = (await db().query(`SELECT (date_trunc('month',now() AT TIME ZONE 'Asia/Dhaka') AT TIME ZONE 'Asia/Dhaka') AS t`))[0].t as Date;
  const [window, month, plans] = await Promise.all([
    costSummary(since), costSummary(new Date(monthStart).toISOString()),
    db().query('SELECT name,price_bdt,writing_limit,speaking_limit FROM public.evaluation_plans WHERE published=true ORDER BY price_bdt'),
  ]);
  const rate = window.budget.rate;
  const sum = (rows: typeof window.rows, skill: string) => rows.filter(r => r.skill === skill).reduce((a, r) => ({ n: a.n + r.priced, usd: a.usd + r.usd, all: a.all + r.evaluations, min: a.min + r.audioMinutes }), { n: 0, usd: 0, all: 0, min: 0 });
  const w = sum(window.rows, 'Writing'), s = sum(window.rows, 'Speaking');
  const avgW = w.n && rate ? bdt(w.usd / w.n, rate) : null, avgS = s.n && rate ? bdt(s.usd / s.n, rate) : null;
  const perMin = s.min && s.usd && rate ? bdt(s.usd, rate)! / s.min : null;
  const monthUsd = month.rows.reduce((a, r) => a + r.usd, 0), monthBdt = rate ? monthUsd * rate : null;
  const cap = window.budget.capBdt, usedPct = cap && monthBdt !== null ? monthBdt / cap * 100 : null;
  const unpriced = window.unpricedModels;
  return <div className="admin-refactor"><WorkspaceHeading eyebrow="AI / COST" title="Cost & usage" />
    <nav className="adm-segment" aria-label="Period">{[7, 30, 90].map(d => <a key={d} href={'?days=' + d} aria-current={d === days ? 'true' : undefined}>{d} days</a>)}</nav>
    {(unpriced.length > 0 || rate === null) && <p className="adm-callout" role="status">
      {rate === null && <>Set the USD→BDT rate below to see BDT. </>}
      {unpriced.length > 0 && <>No price entered for: <strong>{unpriced.join(', ')}</strong>. Those evaluations are counted but not costed, so totals below are a floor.</>}
    </p>}
    <div className="admin-kpi-grid">
      <div className="admin-kpi"><span>Spend this month</span><strong>{monthBdt === null ? '$' + fmt(monthUsd, 2) : '৳' + fmt(monthBdt)}</strong></div>
      <div className="admin-kpi"><span>Writing, per evaluation</span><strong>{avgW === null ? '—' : '৳' + fmt(avgW, 2)}</strong></div>
      <div className="admin-kpi"><span>Speaking, per evaluation</span><strong>{avgS === null ? '—' : '৳' + fmt(avgS, 2)}</strong></div>
      <div className="admin-kpi"><span>Speaking, per audio minute</span><strong>{perMin === null ? '—' : '৳' + fmt(perMin, 2)}</strong></div>
    </div>
    {usedPct !== null && <section className="workspace-panel adm-meter" aria-label="Monthly budget"><div><strong>৳{fmt(monthBdt)}</strong> of ৳{fmt(cap)} monthly cap</div><progress max={100} value={Math.min(100, usedPct)} data-warn={usedPct >= window.budget.alertPercent ? 'true' : undefined} /><span>{fmt(usedPct, 0)}%{usedPct >= window.budget.alertPercent ? ' · over the ' + window.budget.alertPercent + '% alert line' : ''}</span></section>}
    <section className="workspace-panel"><h2>By model · last {days} days</h2><div className="table-scroll"><table className="adm-data-table"><thead><tr><th>Skill</th><th>Model</th><th>Evaluations</th><th>Costed</th><th>Audio min</th><th>Cost</th><th>Per evaluation</th></tr></thead><tbody>
      {window.rows.map(r => { const b = rate ? r.usd * rate : null; return <tr key={r.skill + r.model}><td>{r.skill}</td><td>{r.model}</td><td>{r.evaluations}</td><td>{r.priced}</td><td>{fmt(r.audioMinutes, 1)}</td><td>{r.priced ? (b === null ? '$' + fmt(r.usd, 3) : '৳' + fmt(b, 1)) : '—'}</td><td>{r.priced ? (b === null ? '$' + fmt(r.usd / r.priced, 4) : '৳' + fmt(b / r.priced, 2)) : '—'}</td></tr>; })}
      {!window.rows.length && <tr><td colSpan={7}>No completed evaluations in this period.</td></tr>}</tbody></table></div></section>
    <section className="workspace-panel"><h2>Plan margin, worst case</h2><p className="adm-note">Every credit used, at the average measured cost above. Unlimited plans have no ceiling until you set a fair-use cap.</p><div className="table-scroll"><table className="adm-data-table"><thead><tr><th>Plan</th><th>Price</th><th>Writing</th><th>Speaking</th><th>Max cost</th><th>Margin</th></tr></thead><tbody>
      {plans.map((p: any) => { const r = planWorstCase({ priceBdt: p.price_bdt, writingLimit: p.writing_limit, speakingLimit: p.speaking_limit }, avgW, avgS); return <tr key={p.name}><td>{p.name}</td><td>৳{fmt(p.price_bdt)}</td><td>{p.writing_limit ?? 'Unlimited'}</td><td>{p.speaking_limit ?? 'Unlimited'}</td><td>{r.unlimited ? 'No ceiling' : fmt(r.costBdt === null ? null : r.costBdt, 0)}</td><td data-neg={r.marginBdt !== null && r.marginBdt < 0 ? 'true' : undefined}>{r.marginBdt === null ? '—' : '৳' + fmt(r.marginBdt)}</td></tr>; })}
      {!plans.length && <tr><td colSpan={6}>No published plans.</td></tr>}</tbody></table></div></section>
    <div className="adm-overview-columns">
      <section className="workspace-panel"><h2>Model prices</h2><p className="adm-note">Enter prices from the provider’s pricing page and note the source. Nothing is pre-filled.</p>
        <div className="table-scroll"><table className="adm-data-table"><thead><tr><th>Model</th><th>In $/M</th><th>Out $/M</th><th>Audio $/min</th><th>Verified</th><th></th></tr></thead><tbody>
          {Object.values(window.prices).map(p => <tr key={p.model}><td>{p.model}<small>{p.note}</small></td><td>{fmt(p.inputPerM, 3)}</td><td>{fmt(p.outputPerM, 3)}</td><td>{fmt(p.audioPerMin, 4)}</td><td>{p.verifiedOn ?? '—'}</td><td><form action={deletePrice}><input type="hidden" name="model" value={p.model} /><button type="submit">Remove</button></form></td></tr>)}
          {!Object.keys(window.prices).length && <tr><td colSpan={6}>No prices yet. Add one below.</td></tr>}</tbody></table></div>
        <form action={savePrice} className="adm-form-grid"><label>Model ID<input name="model" required maxLength={160} list="used-models" /></label><datalist id="used-models">{[...new Set(window.rows.map(r => r.model))].map(m => <option key={m} value={m} />)}</datalist>
          <label>Input $/M tokens<input name="input" inputMode="decimal" /></label><label>Output $/M tokens<input name="output" inputMode="decimal" /></label><label>Audio $/minute<input name="audio" inputMode="decimal" /></label>
          <label>Verified on<input name="verified_on" type="date" /></label><label>Source<input name="note" maxLength={300} placeholder="Pricing page URL" /></label><button type="submit" className="button">Save price</button></form></section>
      <section className="workspace-panel"><h2>Budget</h2><form action={saveBudget} className="adm-form-grid"><label>USD→BDT rate<input name="rate" inputMode="decimal" defaultValue={window.budget.rate ?? ''} /></label><label>Monthly cap, ৳<input name="cap" inputMode="numeric" defaultValue={window.budget.capBdt ?? ''} /></label><label>Alert at, %<input name="alert" inputMode="numeric" defaultValue={window.budget.alertPercent} /></label><button type="submit" className="button">Save budget</button></form>
        <p className="adm-note">The cap is a warning line on this page. It does not stop evaluations yet.</p></section>
    </div></div>;
}
