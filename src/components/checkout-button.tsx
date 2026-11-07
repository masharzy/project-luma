'use client';
import { useState } from 'react';

export function CheckoutButton({ planId, planName, disabled }: { planId: string; planName: string; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function place() {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/membership', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request', planId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not place your request.');
      window.location.assign('/dashboard/subscription');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not place your request.'); setBusy(false); }
  }
  return (
    <div>
      <button type="button" className="co-pay" disabled={busy || disabled} onClick={place}>{busy ? 'Placing request…' : `Request ${planName}`}</button>
      {error && <p className="co-error" role="alert">{error}</p>}
    </div>
  );
}
