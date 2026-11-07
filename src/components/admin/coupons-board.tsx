'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Card, CardTitle, dhaka, taka } from './ui';
import { field, labelText, primaryButton, smallGhost } from './form-classes';

export type CouponRow = { id: string; code: string; kind: 'percent' | 'fixed'; value: number; plan_name: string | null; plan_id: string | null; max_uses: number | null; used: number; expires_at: string | null; active: boolean; note: string | null };
async function post(body: Record<string, unknown>) {
  const res = await fetch('/api/admin/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not save.');
}
const randomCode = () => 'JTN' + Math.random().toString(36).slice(2, 7).toUpperCase();
const status = (c: CouponRow) => !c.active ? 'Off' : c.expires_at && new Date(c.expires_at).getTime() <= Date.now() ? 'Expired' : c.max_uses !== null && c.used >= c.max_uses ? 'Used up' : 'Live';

export function CouponsBoard({ coupons, plans }: { coupons: CouponRow[]; plans: { id: string; name: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState({ code: randomCode(), kind: 'percent' as 'percent' | 'fixed', value: 10, planId: '', maxUses: '', expires: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  async function run(task: () => Promise<void>, done: string) {
    setBusy(true); setError(''); setNote('');
    try { await task(); setNote(done); router.refresh(); return true; } catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); return false; } finally { setBusy(false); }
  }
  const th = 'px-4 py-3 text-left text-[12px] font-medium text-muted';
  return (
    <div className="grid gap-6">
      <Card>
        <CardTitle title="New coupon" hint="A member can use each code once. The discount applies to the plan price at checkout." />
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={async e => {
          e.preventDefault();
          const ok = await run(() => post({ action: 'create', coupon: { code: f.code, kind: f.kind, value: f.value, planId: f.planId || null, maxUses: f.maxUses ? Number(f.maxUses) : null, expiresAt: f.expires ? `${f.expires}T23:59:59+06:00` : null, note: f.note || null } }), 'Coupon created.');
          if (ok) setF({ ...f, code: randomCode(), note: '' });
        }}>
          <label><span className={labelText}>Code</span><input className={field + ' uppercase'} required minLength={3} maxLength={40} value={f.code} onChange={e => setF({ ...f, code: e.target.value.toUpperCase() })} /></label>
          <label><span className={labelText}>Discount type</span><select className={field} value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as 'percent' | 'fixed' })}><option value="percent">Percent off</option><option value="fixed">Fixed BDT off</option></select></label>
          <label><span className={labelText}>{f.kind === 'percent' ? 'Percent (1–100)' : 'Amount in BDT'}</span><input className={field} type="number" min={1} max={f.kind === 'percent' ? 100 : 100000} required value={f.value} onChange={e => setF({ ...f, value: Number(e.target.value) })} /></label>
          <label><span className={labelText}>Plan</span><select className={field} value={f.planId} onChange={e => setF({ ...f, planId: e.target.value })}><option value="">Any plan</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label><span className={labelText}>Total uses (blank = no limit)</span><input className={field} type="number" min={1} value={f.maxUses} onChange={e => setF({ ...f, maxUses: e.target.value })} /></label>
          <label><span className={labelText}>Ends on (blank = no end)</span><input className={field} type="date" value={f.expires} onChange={e => setF({ ...f, expires: e.target.value })} /></label>
          <label className="sm:col-span-2"><span className={labelText}>Note (only you see it)</span><input className={field} maxLength={200} value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></label>
          <div className="sm:col-span-2 lg:col-span-4"><button className={primaryButton} disabled={busy}>{busy ? 'Saving…' : 'Create coupon'}</button></div>
        </form>
        {error && <p role="alert" className="m-0 mt-3 rounded-xl bg-warn-soft px-3 py-2 text-[12px] text-warn">{error}</p>}
        {note && <p role="status" className="m-0 mt-3 rounded-xl bg-ok-soft px-3 py-2 text-[12px] text-ok">{note}</p>}
      </Card>
      <Card className="!p-0 overflow-hidden">
        <div className="p-6 pb-4"><CardTitle title="All coupons" hint="Newest first." /></div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr className="border-y border-line"><th className={th}>Code</th><th className={th}>Discount</th><th className={th}>Plan</th><th className={th}>Used</th><th className={th}>Ends</th><th className={th}>Status</th><th className={th}></th></tr></thead>
            <tbody>
              {coupons.map(c => {
                const st = status(c);
                return (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-mono font-medium text-ink">{c.code}{c.note && <div className="font-sans text-[12px] font-normal text-muted">{c.note}</div>}</td>
                    <td className="px-4 py-3 tabular-nums">{c.kind === 'percent' ? c.value + '% off' : taka(c.value) + ' off'}</td>
                    <td className="px-4 py-3 text-muted">{c.plan_name ?? 'Any plan'}</td>
                    <td className="px-4 py-3 tabular-nums">{c.used}{c.max_uses !== null ? ' / ' + c.max_uses : ''}</td>
                    <td className="px-4 py-3 text-muted">{c.expires_at ? dhaka(c.expires_at) : 'No end'}</td>
                    <td className="px-4 py-3"><Badge tone={st === 'Live' ? 'good' : 'neutral'}>{st}</Badge></td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-2">
                      <button type="button" className={smallGhost} disabled={busy} onClick={() => run(() => post({ action: 'toggle', id: c.id, active: !c.active }), c.active ? 'Coupon turned off.' : 'Coupon turned on.')}>{c.active ? 'Turn off' : 'Turn on'}</button>
                      {c.used === 0 && <button type="button" className={smallGhost} disabled={busy} onClick={() => { if (window.confirm('Delete ' + c.code + '?')) void run(() => post({ action: 'delete', id: c.id }), 'Coupon deleted.'); }}>Delete</button>}
                    </div></td>
                  </tr>
                );
              })}
              {!coupons.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">No coupons yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
