'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { smallGhost } from './form-classes';

export function UserActions({ id, role, banned, isSelf }: { id: string; role: string; banned: boolean; isSelf: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function act(action: string, nextRole?: string) {
    if (isSelf) return;
    const question = action === 'ban' ? 'Block this account and sign it out everywhere?' : action === 'unban' ? 'Unblock this account?' : action === 'revoke_sessions' ? 'Sign this account out on every device?' : `Change this account's role to ${nextRole}?`;
    if (!window.confirm(question)) return;
    setBusy(true); setMessage('');
    try {
      const res = await fetch('/api/admin/users/' + encodeURIComponent(id), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...(nextRole ? { role: nextRole } : {}) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      router.refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not update this account.'); } finally { setBusy(false); }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={smallGhost} disabled={busy || isSelf} onClick={() => void act(banned ? 'unban' : 'ban')}>{banned ? 'Unblock' : 'Block'}</button>
      <button type="button" className={smallGhost} disabled={busy || isSelf} onClick={() => void act('revoke_sessions')}>Sign out everywhere</button>
      <button type="button" className={smallGhost} disabled={busy || isSelf} onClick={() => void act('role', role === 'admin' ? 'user' : 'admin')}>{role === 'admin' ? 'Remove admin' : 'Make admin'}</button>
      {isSelf && <span className="text-[12px] text-muted">This is your account</span>}
      {message && <span role="alert" className="text-[12px] text-warn">{message}</span>}
    </div>
  );
}
