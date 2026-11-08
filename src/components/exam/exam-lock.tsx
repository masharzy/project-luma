'use client';
import { useCallback, useEffect, useState } from 'react';
/**
 * Exam mode for a scheduled mock: the page stays full screen, and copying / right-click / developer shortcuts are blocked.
 * Browsers only allow entering full screen from a click or key press, so when someone leaves it (Esc) we try again at once and,
 * if the browser refuses, a blocking screen brings it back on the next click or key press. This is a deterrent, not a security
 * boundary: nothing in a browser can fully stop a determined person.
 */
const editable = (t: EventTarget | null) => t instanceof HTMLElement && Boolean(t.closest('textarea,input,[contenteditable="true"]'));
export const fullscreenSupported = () => typeof document !== 'undefined' && Boolean(document.documentElement.requestFullscreen);
export function enterFullscreen() {
  if (!fullscreenSupported() || document.fullscreenElement) return Promise.resolve();
  return document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
}
export function ExamLock({ active, onViolation }: { active: boolean; onViolation?: (kind: string) => void }) {
  const [full, setFull] = useState(true);
  const supported = typeof document === 'undefined' ? true : fullscreenSupported();
  const report = useCallback((kind: string) => { try { onViolation?.(kind); } catch {} }, [onViolation]);
  useEffect(() => {
    if (!active) return;
    const sync = () => {
      const on = Boolean(document.fullscreenElement);
      setFull(on);
      if (!on) { report('left-fullscreen'); void enterFullscreen(); }
    };
    sync();
    document.addEventListener('fullscreenchange', sync);
    // Any click or key press is a valid gesture to re-enter full screen.
    const regain = (e: Event) => { if (!document.fullscreenElement && !(e instanceof KeyboardEvent && e.key === 'Escape')) void enterFullscreen(); };
    const stop = (e: Event) => { if (!editable(e.target)) { e.preventDefault(); report(e.type); } };
    const menu = (e: Event) => { e.preventDefault(); report('contextmenu'); };
    const keys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
      if (e.key === 'F12' || (mod && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) || (mod && ['u', 's', 'p'].includes(k)) || (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(k))) { e.preventDefault(); e.stopPropagation(); report('shortcut'); }
      else if (mod && ['c', 'x', 'a'].includes(k) && !editable(e.target)) { e.preventDefault(); }
    };
    document.addEventListener('click', regain, true);
    document.addEventListener('keydown', regain, true);
    document.addEventListener('keydown', keys, true);
    document.addEventListener('contextmenu', menu, true);
    document.addEventListener('copy', stop, true);
    document.addEventListener('cut', stop, true);
    document.addEventListener('dragstart', stop, true);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('click', regain, true);
      document.removeEventListener('keydown', regain, true);
      document.removeEventListener('keydown', keys, true);
      document.removeEventListener('contextmenu', menu, true);
      document.removeEventListener('copy', stop, true);
      document.removeEventListener('cut', stop, true);
      document.removeEventListener('dragstart', stop, true);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, [active, report]);
  return <>
    {active && supported && !full && <div role="alertdialog" aria-modal="true" aria-label="Full screen required" style={{ position: 'fixed', inset: 0, zIndex: 2147483647, background: '#0b0d12', color: '#fff', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Full screen is required</h1>
        <p lang="bn" style={{ margin: '0 0 18px', opacity: 0.8 }}>পরীক্ষা চলাকালীন full screen থাকতে হবে। চালিয়ে যেতে নিচের বাটনে ক্লিক করো বা যেকোনো key চাপো। টাইমার থামবে না।</p>
        <button type="button" onClick={() => void enterFullscreen()} style={{ background: '#fff', color: '#0b0d12', border: 0, borderRadius: 999, padding: '12px 22px', fontWeight: 600, cursor: 'pointer' }}>Return to full screen</button>
      </div>
    </div>}
  </>;
}
