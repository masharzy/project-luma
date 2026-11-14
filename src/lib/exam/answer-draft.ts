// Device-side copy of the answers in an open module. It survives a reload, a closed tab and a closed browser,
// so an answer typed while the server was unreachable is never lost and is pushed again on the next save.
// Pure helpers over a Storage-like object so they can be tested without a browser.
export type Answers = Record<string, string>;
export type Draft = { a: Answers; synced: boolean; t: number };
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
const PREFIX = 'j9-attempt-draft:';
const LEGACY = 'luma-attempt:';
export const draftKey = (attemptId: string, index: number) => PREFIX + attemptId + ':' + index;
function store(): Store | null { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } }
function clean(value: unknown): Answers | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out: Answers = {};
  for (const [k, v] of Object.entries(value)) if (typeof v === 'string') out[k] = v;
  return out;
}
export function readDraft(attemptId: string, index: number, s: Store | null = store()): Draft | null {
  if (!s) return null;
  try {
    const raw = s.getItem(draftKey(attemptId, index));
    if (raw) {
      const d = JSON.parse(raw);
      const a = clean(d?.a);
      if (a) return { a, synced: d.synced === true, t: Number(d.t) || 0 };
    }
  } catch { /* corrupt entry: ignore */ }
  // Answers kept by the previous version (per-tab sessionStorage) are treated as not yet synced.
  try {
    const legacy = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(LEGACY + attemptId + ':' + index);
    const a = legacy ? clean(JSON.parse(legacy)) : null;
    if (a) return { a, synced: false, t: 0 };
  } catch { /* ignore */ }
  return null;
}
export function writeDraft(attemptId: string, index: number, answers: Answers, synced: boolean, s: Store | null = store()) {
  if (!s) return false;
  try { s.setItem(draftKey(attemptId, index), JSON.stringify({ a: answers, synced, t: Date.now() })); return true; } catch { return false; }
}
/** Mark the draft as saved on the server, but only if it still holds exactly what was sent. */
export function markSynced(attemptId: string, index: number, sent: Answers, s: Store | null = store()) {
  const d = readDraft(attemptId, index, s);
  if (d && JSON.stringify(d.a) === JSON.stringify(sent)) writeDraft(attemptId, index, sent, true, s);
}
/** Remove drafts of this attempt for every module before `keepFrom` (all of them when keepFrom is Infinity). */
export function clearDrafts(attemptId: string, keepFrom = Infinity, s: Store | null = store()) {
  if (!s) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k?.startsWith(PREFIX + attemptId + ':')) keys.push(k); }
    for (const k of keys) if (Number(k.slice(k.lastIndexOf(':') + 1)) < keepFrom) s.removeItem(k);
  } catch { /* ignore */ }
  try { if (typeof sessionStorage !== 'undefined') for (let i = 0; i < 8; i++) if (i < keepFrom) sessionStorage.removeItem(LEGACY + attemptId + ':' + i); } catch { /* ignore */ }
}
/**
 * Answers to show when a module opens. Unsynced device edits win over the server copy (they are newer);
 * a synced draft equals the server copy, so the server wins.
 */
export function restoreAnswers(server: Answers, draft: Draft | null): { answers: Answers; dirty: boolean } {
  if (draft && !draft.synced) return { answers: { ...server, ...draft.a }, dirty: true };
  return { answers: { ...server }, dirty: false };
}
