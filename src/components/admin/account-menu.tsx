'use client';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ExternalLink, GraduationCap, LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth/client';

export function initialsOf(name: string, email: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? email).slice(0, 2);
  return letters.toUpperCase();
}

export function Avatar({ name, email, size = 32 }: { name: string; email: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className="inline-grid shrink-0 place-items-center rounded-full border border-line bg-soft font-semibold tracking-wide text-ink"
    >
      {initialsOf(name, email)}
    </span>
  );
}

export function AccountMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) { if (e.key === 'Escape') setOpen(false); return; }
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  async function signOut() {
    setPending(true); setError('');
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      window.location.assign('/auth/sign-in');
    } catch { setError('Could not sign out. Try again.'); setPending(false); }
  }
  const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-ink no-underline hover:bg-soft';
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(v => !v)}
        className="flex h-10 cursor-pointer items-center gap-2.5 rounded-full border border-line bg-transparent py-1 pl-1 pr-3 hover:bg-soft"
      >
        <Avatar name={name} email={email} />
        <span className="hidden min-w-0 text-left leading-tight sm:block">
          <span className="block max-w-[150px] truncate text-[13px] font-semibold text-ink">{name}</span>
          <span className="block max-w-[150px] truncate text-[11px] text-muted">{email}</span>
        </span>
        <ChevronDown size={14} aria-hidden="true" className="text-muted" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[260px] rounded-card border border-line bg-raised p-1.5 shadow-card"
        >
          <div className="flex items-center gap-3 px-3 py-3">
            <Avatar name={name} email={email} size={40} />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-ink">{name}</div>
              <div className="truncate text-[12px] text-muted">{email}</div>
              <div className="mt-1 inline-block rounded-full border border-line px-2 py-px text-[11px] text-muted">Administrator</div>
            </div>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link role="menuitem" href="/" target="_blank" rel="noopener noreferrer" className={item}><ExternalLink size={15} aria-hidden="true" />View website</Link>
          <Link role="menuitem" href="/dashboard" className={item}><GraduationCap size={15} aria-hidden="true" />Learner dashboard</Link>
          <div className="my-1 h-px bg-line" />
          <button type="button" role="menuitem" disabled={pending} onClick={signOut} className={item + ' cursor-pointer border-0 bg-transparent text-left'}>
            <LogOut size={15} aria-hidden="true" />{pending ? 'Signing out…' : 'Sign out'}
          </button>
          {error && <p role="alert" className="m-0 px-3 pb-2 text-[12px] text-warn">{error}</p>}
        </div>
      )}
    </div>
  );
}
