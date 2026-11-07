'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge, Card, CardTitle, taka } from './ui';
import { field, ghostButton, labelText, primaryButton, smallGhost } from './form-classes';

export type PlanRow = { id: string; name: string; description: string; price_bdt: number; writing_limit: number | null; speaking_limit: number | null; published: boolean; members: number };
type Draft = { id?: string; name: string; description: string; priceBdt: number; writingLimit: number | null; speakingLimit: number | null; published: boolean };
const blank = (): Draft => ({ name: '', description: '', priceBdt: 999, writingLimit: 30, speakingLimit: 8, published: false });
const quota = (n: number | null) => (n === null ? 'Unlimited' : n.toLocaleString('en-US'));

async function save(body: Record<string, unknown>) {
  const res = await fetch('/api/admin/memberships', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not save.');
}

function LimitField({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div>
      <span className={labelText}>{label} a month</span>
      <div className="flex items-center gap-3">
        <input className={field} type="number" min={0} max={10000} disabled={value === null} value={value ?? ''} onChange={e => onChange(Number(e.target.value))} aria-label={label + ' evaluations a month'} />
        <label className="flex shrink-0 items-center gap-2 text-[13px] text-ink"><input type="checkbox" checked={value === null} onChange={e => onChange(e.target.checked ? null : 10)} />Unlimited</label>
      </div>
    </div>
  );
}

export function PlansBoard({ plans, free }: { plans: PlanRow[]; free: { free_writing: number; free_speaking: number } }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Draft>(blank());
  const [freeLimits, setFreeLimits] = useState({ freeWriting: free.free_writing, freeSpeaking: free.free_speaking });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const open = (d: Draft) => { setDraft(d); setError(''); dialog.current?.showModal(); };
  async function run(task: () => Promise<void>, done: string) {
    setBusy(true); setError(''); setNote('');
    try { await task(); setNote(done); router.refresh(); return true; } catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); return false; } finally { setBusy(false); }
  }
  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-[16px] font-semibold tracking-tight text-ink">Plans</h2>
        <button type="button" className={primaryButton} onClick={() => open(blank())}><Plus size={15} aria-hidden="true" />New plan</button>
      </div>
      {note && <p role="status" className="m-0 rounded-xl bg-ok-soft px-3 py-2 text-[13px] text-ok">{note}</p>}
      {error && !dialog.current?.open && <p role="alert" className="m-0 rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map(p => (
          <Card key={p.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h3 className="m-0 text-[16px] font-semibold text-ink">{p.name}</h3>
              <Badge tone={p.published ? 'good' : 'neutral'}>{p.published ? 'Published' : 'Hidden'}</Badge>
            </div>
            <p className="m-0 mt-3 text-ink"><span className="text-[32px] font-semibold tracking-tight tabular-nums">{taka(p.price_bdt)}</span><span className="ml-1 text-[13px] text-muted">/ 30 days</span></p>
            <p className="m-0 mt-2 min-h-[40px] text-[13px] text-muted">{p.description || 'No description.'}</p>
            <dl className="m-0 mt-4 grid gap-2 border-t border-line pt-4 text-[13px]">
              <div className="flex justify-between"><dt className="text-muted">Writing evaluations</dt><dd className="m-0 font-medium tabular-nums text-ink">{quota(p.writing_limit)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Speaking evaluations</dt><dd className="m-0 font-medium tabular-nums text-ink">{quota(p.speaking_limit)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Active members</dt><dd className="m-0 font-medium tabular-nums text-ink">{p.members}</dd></div>
            </dl>
            <div className="mt-5 flex gap-2">
              <button type="button" className={smallGhost} onClick={() => open({ id: p.id, name: p.name, description: p.description, priceBdt: p.price_bdt, writingLimit: p.writing_limit, speakingLimit: p.speaking_limit, published: p.published })}>Edit</button>
              <button type="button" className={smallGhost} disabled={busy} onClick={() => run(() => save({ action: 'plan', plan: { id: p.id, name: p.name, description: p.description, priceBdt: p.price_bdt, writingLimit: p.writing_limit, speakingLimit: p.speaking_limit, published: !p.published } }), p.published ? 'Plan hidden from the pricing page.' : 'Plan published.')}>{p.published ? 'Hide' : 'Publish'}</button>
            </div>
          </Card>
        ))}
        {!plans.length && <Card className="md:col-span-2 xl:col-span-3"><p className="m-0 py-6 text-center text-[13px] text-muted">No plans yet. Create the first one.</p></Card>}
      </div>

      <Card>
        <CardTitle title="Free allowance" hint="Monthly AI evaluations for every verified account without a plan. 0 turns evaluation off." />
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={e => { e.preventDefault(); void run(() => save({ action: 'policy', policy: freeLimits }), 'Free allowance saved.'); }}>
          <label><span className={labelText}>Writing a month</span><input className={field} type="number" min={0} max={10000} required value={freeLimits.freeWriting} onChange={e => setFreeLimits({ ...freeLimits, freeWriting: Number(e.target.value) })} /></label>
          <label><span className={labelText}>Speaking a month</span><input className={field} type="number" min={0} max={10000} required value={freeLimits.freeSpeaking} onChange={e => setFreeLimits({ ...freeLimits, freeSpeaking: Number(e.target.value) })} /></label>
          <button className={primaryButton} disabled={busy}>Save</button>
        </form>
      </Card>

      <dialog ref={dialog} aria-labelledby="plan-dialog-title" className="m-auto w-[min(520px,calc(100vw-32px))] rounded-card border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-black/50">
        <form className="grid gap-4 p-6" onSubmit={async e => { e.preventDefault(); if (await run(() => save({ action: 'plan', plan: draft }), draft.id ? 'Plan saved. Current members keep the price and limits they signed up with.' : 'Plan created.')) dialog.current?.close(); }}>
          <h2 id="plan-dialog-title" className="m-0 text-[18px] font-semibold tracking-tight">{draft.id ? 'Edit plan' : 'New plan'}</h2>
          <label><span className={labelText}>Name</span><input className={field} required minLength={2} maxLength={80} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
          <label><span className={labelText}>Short description</span><textarea className={field + ' !h-20 py-2'} maxLength={400} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
          <label><span className={labelText}>Price in BDT for 30 days</span><input className={field} type="number" min={0} max={100000} required value={draft.priceBdt} onChange={e => setDraft({ ...draft, priceBdt: Number(e.target.value) })} /></label>
          <LimitField label="Writing" value={draft.writingLimit} onChange={v => setDraft({ ...draft, writingLimit: v })} />
          <LimitField label="Speaking" value={draft.speakingLimit} onChange={v => setDraft({ ...draft, speakingLimit: v })} />
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={draft.published} onChange={e => setDraft({ ...draft, published: e.target.checked })} />Show on the pricing page</label>
          {error && <p role="alert" className="m-0 rounded-xl bg-warn-soft px-3 py-2 text-[12px] text-warn">{error}</p>}
          <div className="flex justify-end gap-2"><button type="button" className={ghostButton} onClick={() => dialog.current?.close()}>Cancel</button><button className={primaryButton} disabled={busy}>{busy ? 'Saving…' : 'Save plan'}</button></div>
        </form>
      </dialog>
    </div>
  );
}
