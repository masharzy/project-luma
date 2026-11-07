'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// One place for the admin access calls: posts the action, refreshes the page, and keeps the error text.
export function useAccessAction(userId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  async function run(body: Record<string, unknown>, success: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return false;
    setBusy(true); setError(''); setDone('');
    try {
      const res = await fetch('/api/admin/users/' + encodeURIComponent(userId) + '/access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save this change.');
      setDone(success); router.refresh(); return true;
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save this change.'); return false; }
    finally { setBusy(false); }
  }
  return { run, busy, error, done };
}
// A date picked in the admin means the end of that day in Dhaka.
export const endOfDay = (date: string) => (date ? `${date}T23:59:59+06:00` : null);
