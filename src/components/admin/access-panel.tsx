'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { Badge, Card, CardTitle, dhaka, taka } from './ui';
import { field, ghostButton, labelText, primaryButton, smallGhost } from './form-classes';
import { endOfDay, useAccessAction } from './use-access-action';
import { grantScopeLabels, type GrantScope } from '@/lib/learner/content-grants';

type Plan = { id: string; name: string; price_bdt: number; writing_limit: number | null; speaking_limit: number | null };
type Active = { id: string; plan_name: string; price_bdt: number; writing_limit: number | null; speaking_limit: number | null; starts_at: string; expires_at: string } | null;
type Allowance = { product: string; monthly_limit: number | null; source: string; override_until: string | null; used: number };
type Grant = { id: string; scope: GrantScope; ref: string | null; note: string | null; expires_at: string | null };
type Option = { value: string; label: string };
const quota = (n: number | null) => (n === null ? 'Unlimited' : String(n));
const productName = (p: string) => (p === 'writing_product' ? 'Writing' : 'Speaking');
const sourceLabel: Record<string, string> = { override: 'Admin override', subscription: 'From plan', free: 'Free allowance' };
const needsItem = (s: string) => !['all_premium', 'recent_all', 'more_books_all'].includes(s);
const scopeOrder: GrantScope[] = ['all_premium', 'cambridge_book', 'cambridge_test', 'recent_all', 'recent_test', 'more_books_all', 'more_books_volume', 'more_books_test'];

function Notice({ error, done }: { error: string; done: string }) {
  if (error) return <p role="alert" className="m-0 mt-3 rounded-xl bg-warn-soft px-3 py-2 text-[12px] text-warn">{error}</p>;
  if (done) return <p role="status" className="m-0 mt-3 rounded-xl bg-ok-soft px-3 py-2 text-[12px] text-ok">{done}</p>;
  return null;
}

function PlanCard({ userId, plans, active }: { userId: string; plans: Plan[]; active: Active }) {
  const { run, busy, error, done } = useAccessAction(userId);
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const [days, setDays] = useState(30);
  const chosen = plans.find(p => p.id === planId);
  return (
    <Card>
      <CardTitle title="Plan" hint="A plan sets the monthly AI limits and unlocks all premium tests." />
      {active ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-bg p-4">
          <div>
            <div className="flex items-center gap-2"><span className="text-[15px] font-semibold text-ink">{active.plan_name}</span><Badge tone="good">Active</Badge></div>
            <p className="m-0 mt-1 text-[12px] text-muted">{dhaka(active.starts_at)} to {dhaka(active.expires_at)} · {taka(active.price_bdt)} · Writing {quota(active.writing_limit)}, Speaking {quota(active.speaking_limit)} a month</p>
          </div>
          <button type="button" className={smallGhost} disabled={busy} onClick={() => run({ action: 'end_subscription', subscriptionId: active.id }, 'Plan ended.', 'End this plan now? The learner loses premium access immediately.')}>End plan</button>
        </div>
      ) : <p className="m-0 mb-5 rounded-xl border border-dashed border-line p-4 text-[13px] text-muted">No active plan. This account uses the free allowance.</p>}
      {plans.length ? (
        <form className="grid gap-3 sm:grid-cols-[1fr_130px_auto] sm:items-end" onSubmit={e => { e.preventDefault(); void run({ action: 'assign_plan', planId, days }, 'Plan given.', active ? 'This replaces the current plan. Continue?' : undefined); }}>
          <label><span className={labelText}>Plan</span>
            <select className={field} value={planId} onChange={e => setPlanId(e.target.value)}>{plans.map(p => <option key={p.id} value={p.id}>{p.name} · {taka(p.price_bdt)}</option>)}</select></label>
          <label><span className={labelText}>Days</span>
            <input className={field} type="number" min={1} max={3660} value={days} onChange={e => setDays(Number(e.target.value))} /></label>
          <button className={primaryButton} disabled={busy || !planId}>{active ? 'Replace plan' : 'Give plan'}</button>
          {chosen && <p className="m-0 text-[12px] text-muted sm:col-span-3">Writing {quota(chosen.writing_limit)} and Speaking {quota(chosen.speaking_limit)} evaluations a month.</p>}
        </form>
      ) : <p className="m-0 text-[13px] text-muted">Create a plan on the Plans page first.</p>}
      <Notice error={error} done={done} />
    </Card>
  );
}

function LimitRow({ userId, a }: { userId: string; a: Allowance }) {
  const { run, busy, error, done } = useAccessAction(userId);
  const [unlimited, setUnlimited] = useState(false);
  const [value, setValue] = useState(a.monthly_limit ?? 10);
  const [until, setUntil] = useState('');
  const pct = a.monthly_limit === null ? 0 : a.monthly_limit === 0 ? 100 : Math.min(100, Math.round((a.used / a.monthly_limit) * 100));
  return (
    <div className="rounded-xl border border-line bg-bg p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><span className="text-[14px] font-semibold text-ink">{productName(a.product)} evaluations</span><Badge tone={a.source === 'override' ? 'accent' : 'neutral'}>{sourceLabel[a.source] ?? a.source}</Badge></div>
        <span className="text-[13px] tabular-nums text-ink">{a.used} of {quota(a.monthly_limit)} used this month</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-soft" aria-hidden="true"><div className="h-full rounded-full bg-ink" style={{ width: (a.monthly_limit === null ? 4 : pct) + '%' }} /></div>
      {a.override_until && <p className="m-0 mt-2 text-[12px] text-muted">Override ends {dhaka(a.override_until)}.</p>}
      <form className="mt-4 grid gap-3 sm:grid-cols-[110px_1fr_150px_auto] sm:items-end" onSubmit={e => { e.preventDefault(); void run({ action: 'set_limit', product: a.product, monthlyLimit: unlimited ? null : value, expiresAt: endOfDay(until) }, 'Limit saved.'); }}>
        <label><span className={labelText}>Per month</span><input className={field} type="number" min={0} max={10000} disabled={unlimited} value={value} onChange={e => setValue(Number(e.target.value))} /></label>
        <label className="flex h-10 items-center gap-2 text-[13px] text-ink"><input type="checkbox" checked={unlimited} onChange={e => setUnlimited(e.target.checked)} />Unlimited</label>
        <label><span className={labelText}>Until</span><input className={field} type="date" required value={until} onChange={e => setUntil(e.target.value)} /></label>
        <button className={primaryButton} disabled={busy || !until}>Set limit</button>
      </form>
      {a.source === 'override' && <button type="button" className={smallGhost + ' mt-3'} disabled={busy} onClick={() => run({ action: 'clear_limit', product: a.product }, 'Override removed.')}>Remove override</button>}
      <Notice error={error} done={done} />
    </div>
  );
}

function LimitsCard({ userId, allowances }: { userId: string; allowances: Allowance[] }) {
  const { run, busy, error, done } = useAccessAction(userId);
  return (
    <Card>
      <CardTitle title="AI evaluation limits" hint="An override beats the plan and the free allowance until its end date."
        action={<button type="button" className={smallGhost} disabled={busy} onClick={() => run({ action: 'reset_usage' }, 'This month’s usage is reset.', 'Reset the usage count for this month?')}>Reset this month</button>} />
      <div className="grid gap-3">{allowances.map(a => <LimitRow key={a.product} userId={userId} a={a} />)}</div>
      <Notice error={error} done={done} />
    </Card>
  );
}

function ContentCard({ userId, grants, options }: { userId: string; grants: Grant[]; options: Record<string, Option[]> }) {
  const { run, busy, error, done } = useAccessAction(userId);
  const [scope, setScope] = useState<GrantScope>('cambridge_book');
  const [ref, setRef] = useState('');
  const [until, setUntil] = useState('');
  const [note, setNote] = useState('');
  const list = options[scope] ?? [];
  const labelOf = (g: Grant) => (g.ref ? (options[g.scope] ?? []).find(o => o.value === g.ref)?.label ?? g.ref : '');
  const reset = () => { setRef(''); setUntil(''); setNote(''); };
  return (
    <Card>
      <CardTitle title="Content access" hint="Unlock specific tests without a plan. Several unlocks can sit side by side." />
      <div className="mb-5 flex flex-wrap gap-2">
        {grants.map(g => (
          <span key={g.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-bg py-1 pl-3 pr-1 text-[12px] text-ink">
            <span><strong className="font-semibold">{grantScopeLabels[g.scope]}</strong>{g.ref ? ' · ' + labelOf(g) : ''}<span className="text-muted"> · {g.expires_at ? 'until ' + dhaka(g.expires_at) : 'no end date'}</span></span>
            <button type="button" aria-label="Remove this unlock" disabled={busy} onClick={() => run({ action: 'revoke_content', grantId: g.id }, 'Unlock removed.')} className="grid h-6 w-6 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-muted hover:bg-soft hover:text-ink"><X size={13} aria-hidden="true" /></button>
          </span>
        ))}
        {!grants.length && <p className="m-0 text-[13px] text-muted">Nothing unlocked for this account beyond its plan.</p>}
      </div>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={async e => { e.preventDefault(); if (await run({ action: 'grant_content', scope, ref: needsItem(scope) ? ref : null, expiresAt: endOfDay(until), note }, 'Unlocked.')) reset(); }}>
        <label><span className={labelText}>What to unlock</span>
          <select className={field} value={scope} onChange={e => { setScope(e.target.value as GrantScope); setRef(''); }}>{scopeOrder.map(s => <option key={s} value={s}>{grantScopeLabels[s]}</option>)}</select></label>
        {needsItem(scope) ? (
          <label><span className={labelText}>Which one</span>
            <select className={field} required value={ref} onChange={e => setRef(e.target.value)}><option value="">Choose…</option>{list.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        ) : <div className="hidden sm:block" />}
        <label><span className={labelText}>Ends on (optional)</span><input className={field} type="date" value={until} onChange={e => setUntil(e.target.value)} /></label>
        <label><span className={labelText}>Note (optional)</span><input className={field} maxLength={200} value={note} onChange={e => setNote(e.target.value)} placeholder="Why this was given" /></label>
        <div className="sm:col-span-2"><button className={primaryButton} disabled={busy || (needsItem(scope) && !ref)}>Unlock</button></div>
      </form>
      <p className="m-0 mt-3 text-[12px] text-muted">Applies to Listening, Reading and Writing tests. Speaking tests still follow the plan.</p>
      <Notice error={error} done={done} />
    </Card>
  );
}

export function AccessPanel(props: { userId: string; plans: Plan[]; active: Active; allowances: Allowance[]; grants: Grant[]; options: Record<string, Option[]>; ready: boolean }) {
  return (
    <div className="grid gap-5">
      {!props.ready && <p role="alert" className="m-0 rounded-card border border-line bg-warn-soft p-4 text-[13px] text-warn">Content unlocks and devices need migration 036. Plans and limits work now.</p>}
      <PlanCard userId={props.userId} plans={props.plans} active={props.active} />
      <LimitsCard userId={props.userId} allowances={props.allowances} />
      <ContentCard userId={props.userId} grants={props.grants} options={props.options} />
    </div>
  );
}
