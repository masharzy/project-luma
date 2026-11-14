'use client';
/**
 * Listening audio for a scheduled mock. One <audio> element per audio file, all preloaded while people wait, and playback is
 * scheduled against the SERVER clock, so every candidate hears the same second at the same moment. Reloading mid-test seeks to the
 * right place instead of restarting. Plain media elements are used (no fetch) so the existing media CSP and third-party hosts keep working.
 */
export type AudioStatus = { loaded: number; total: number; ready: boolean; playing: boolean; blocked: boolean; failed: boolean };
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQAAAAA=';
const pool: HTMLAudioElement[] = [];
/** Call from a click: lets every later scripted play() succeed (Safari/Chrome autoplay rules). */
export function unlockAudio() {
  // The mock page CSP allows media from blob: but not data:, so the silent clip is played from a blob URL.
  try { const bytes = Uint8Array.from(atob(SILENT.split(',')[1]), c => c.charCodeAt(0)); const a = new Audio(URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }))); a.volume = 0; void a.play().then(() => a.pause()).catch(() => {}); pool.push(a); } catch {}
}
export function startMockAudio(urls: string[], startAt: number, serverNow: () => number, onStatus: (s: AudioStatus) => void) {
  const els = urls.map(u => { const a = new Audio(); a.preload = 'auto'; a.src = u; return a; });
  const status: AudioStatus = { loaded: 0, total: els.length, ready: !els.length, playing: false, blocked: false, failed: false };
  const emit = () => onStatus({ ...status });
  let dead = false, started = false; const timers: number[] = [];
  const durations = els.map(() => NaN);
  const buffered = (a: HTMLAudioElement) => a.readyState >= 4 || (a.duration > 0 && a.buffered.length > 0 && a.buffered.end(a.buffered.length - 1) >= a.duration - 1);
  const refresh = () => { status.loaded = els.filter(buffered).length; status.ready = status.loaded === els.length; emit(); };
  els.forEach((a, i) => {
    a.addEventListener('loadedmetadata', () => { durations[i] = a.duration; tryPlan(); });
    a.addEventListener('progress', refresh); a.addEventListener('canplaythrough', refresh); a.addEventListener('canplay', refresh);
    a.addEventListener('error', () => { status.failed = true; emit(); });
    a.load();
  });
  emit();
  function tryPlan() {
    if (dead || started || durations.some(d => !Number.isFinite(d))) return;
    started = true;
    const starts: number[] = []; let t = startAt; for (const d of durations) { starts.push(t); t += d * 1000; }
    const playFrom = async (i: number, offset: number) => {
      if (dead || i >= els.length) return;
      const a = els[i];
      try { if (offset > 0) a.currentTime = offset; await a.play(); status.playing = true; status.blocked = false; emit(); }
      catch { status.blocked = true; emit(); return; }
      a.onended = () => { status.playing = i < els.length - 1; emit(); void playFrom(i + 1, 0); };
    };
    const now = serverNow();
    const idx = starts.findIndex((s, i) => now < s + durations[i] * 1000);
    if (idx < 0) return; // the whole recording is over
    if (now >= starts[idx]) { void playFrom(idx, (now - starts[idx]) / 1000); return; }
    // Wait for the exact moment: coarse timer first, then a tight loop for the last 40 ms.
    const wait = starts[idx] - now;
    const fire = () => { if (dead) return; if (serverNow() >= starts[idx]) void playFrom(idx, Math.max(0, (serverNow() - starts[idx]) / 1000)); else timers.push(window.setTimeout(fire, 4)); };
    timers.push(window.setTimeout(fire, Math.max(0, wait - 40)));
  }
  return {
    /** Used by the "tap to enable sound" button if the browser refused autoplay. */
    resume() { started = false; status.blocked = false; tryPlan(); },
    stop() { dead = true; timers.forEach(clearTimeout); els.forEach(a => { a.onended = null; a.pause(); a.removeAttribute('src'); a.load(); }); },
  };
}
