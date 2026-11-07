import { z } from 'zod';
// What a plan unlocks beyond the monthly Writing and Speaking evaluations. Pure rules, no database access.
const off = z.object({ mode: z.literal('off') });
const all = z.object({ mode: z.literal('all') });
const amount = z.discriminatedUnion('mode', [off, all, z.object({ mode: z.literal('count'), count: z.number().int().min(1).max(10000) })]);
const pick = z.discriminatedUnion('mode', [off, all, z.object({ mode: z.literal('some'), items: z.array(z.string().trim().min(1).max(120)).min(1).max(200) })]);
export const accessSchema = z.object({
  recent: amount, cambridge: pick, moreBooks: pick,
  cueCards: z.boolean(), writingSamples: amount, vocabulary: amount, ebooks: z.boolean(), grammar: z.boolean(),
}).strict();
export type PlanAccess = z.infer<typeof accessSchema>;
export type Amount = z.infer<typeof amount>;
export type Pick = z.infer<typeof pick>;
export const everything: PlanAccess = { recent: { mode: 'all' }, cambridge: { mode: 'all' }, moreBooks: { mode: 'all' }, cueCards: true, writingSamples: { mode: 'all' }, vocabulary: { mode: 'all' }, ebooks: true, grammar: true };
export const nothing: PlanAccess = { recent: { mode: 'off' }, cambridge: { mode: 'off' }, moreBooks: { mode: 'off' }, cueCards: false, writingSamples: { mode: 'off' }, vocabulary: { mode: 'off' }, ebooks: false, grammar: false };
// A plan saved before access settings existed has no access data and keeps unlocking everything.
export function normalizeAccess(raw: unknown): PlanAccess {
  if (raw === null || raw === undefined) return everything;
  const parsed = accessSchema.safeParse(raw);
  return parsed.success ? parsed.data : nothing;
}
export function durationLabel(days: number) {
  const d = Math.max(1, Math.round(days));
  if (d % 365 === 0) { const y = d / 365; return y === 1 ? '1 year' : y + ' years'; }
  if (d % 30 === 0) { const m = d / 30; return m === 1 ? '1 month' : m + ' months'; }
  return d + ' days';
}
export type AccessLine = { label: string; value: string; on: boolean };
const amountLine = (label: string, a: Amount): AccessLine => a.mode === 'off' ? { label, value: '', on: false } : { label, value: a.mode === 'all' ? 'All' : String(a.count), on: true };
const pickLine = (label: string, p: Pick, short: string): AccessLine => p.mode === 'off' ? { label, value: '', on: false } : { label, value: p.mode === 'all' ? 'All' : p.items.length + ' ' + short, on: true };
const flag = (label: string, on: boolean): AccessLine => ({ label, value: '', on });
// One short line per feature, so a pricing card shows what is and is not included.
export function accessLines(raw: unknown): AccessLine[] {
  const a = normalizeAccess(raw);
  return [
    amountLine('Recent Tests', a.recent), pickLine('Cambridge books', a.cambridge, 'books'), pickLine('More Books', a.moreBooks, 'volumes'),
    flag('Cue cards', a.cueCards), amountLine('Writing samples', a.writingSamples), amountLine('Vocabulary', a.vocabulary),
    flag('E-book shelf', a.ebooks), flag('Grammar', a.grammar),
  ];
}
export type TestPlace = { kind: 'cambridge' | 'practice'; id: string; book?: string | null };
// attempted: Recent Tests this member has already opened during the plan; they stay open.
export function planCoversTest(raw: unknown, t: TestPlace, attempted: ReadonlySet<string>) {
  const a = normalizeAccess(raw);
  const pickCovers = (p: Pick) => p.mode === 'all' || (p.mode === 'some' && !!t.book && p.items.includes(t.book));
  if (t.kind === 'cambridge') return pickCovers(a.cambridge);
  if (t.book) return pickCovers(a.moreBooks);
  if (a.recent.mode === 'all') return true;
  if (a.recent.mode === 'count') return attempted.has(t.id) || attempted.size < a.recent.count;
  return false;
}
// Premium learning resources: how many of a kind the plan opens, or null for none.
export function amountFor(a: Amount): number | null {
  return a.mode === 'off' ? null : a.mode === 'all' ? Infinity : a.count;
}
