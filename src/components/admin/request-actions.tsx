'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { primaryButton, smallGhost } from './form-classes';

export function RequestActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function act(action: 'approve' | 'reject' | 'cancel', confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/admin/memberships', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not update.');
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update.'); } finally { setBusy(false); }
  }
  if (status === 'pending') return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button type="button" className={primaryButton + ' !h-8 !px-3 !text-[12px]'} disabled={busy} onClick={() => act('approve', 'Approve and start 30 days of access? Confirm the payment first. Any current plan is replaced.')}>Approve</button>
      <button type="button" className={smallGhost} disabled={busy} onClick={() => act('reject', 'Reject this request?')}>Reject</button>
      {error && <span role="alert" className="w-full text-right text-[12px] text-warn">{error}</span>}
    </div>
  );
  if (status === 'active') return (
    <div className="flex justify-end"><button type="button" className={smallGhost} disabled={busy} onClick={() => act('cancel', 'End this plan now? Access stops immediately. No refund is issued here.')}>End plan</button>{error && <span role="alert" className="ml-2 text-[12px] text-warn">{error}</span>}</div>
  );
  return null;
}
