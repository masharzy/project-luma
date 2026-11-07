'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { field, labelText, primaryButton } from './form-classes';

// Platform-wide default for signed-in devices per account. Individual accounts can override it on their profile.
export function DeviceDefaultForm({ initial }: { initial: number | null }) {
  const router = useRouter();
  const [value, setValue] = useState(initial === null ? '' : String(initial));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  async function save() {
    setBusy(true); setMsg(''); setErr('');
    try {
      const res = await fetch('/api/admin/settings/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceLimit: value === '' ? null : Number(value) }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      setMsg('Saved'); router.refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save.'); }
    finally { setBusy(false); }
  }
  return (
    <div className="admin-app">
      <label className={labelText} htmlFor="default-devices">Devices allowed per account</label>
      <div className="flex items-center gap-2">
        <select id="default-devices" className={field + ' max-w-[200px]'} value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="">Unlimited</option>
          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? 'device' : 'devices'}</option>)}
        </select>
        <button type="button" className={primaryButton} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
      <p className="mt-2 text-[12px] text-muted">When a new device signs in over the limit, the oldest session is signed out. Override per account from the user profile.</p>
      {msg && <p className="mt-2 text-[12px] text-ok">{msg}</p>}
      {err && <p className="mt-2 text-[12px] text-warn">{err}</p>}
    </div>
  );
}
