export type ModelPrice = { model: string; inputPerM: number | null; outputPerM: number | null; audioPerMin: number | null; note?: string; verifiedOn?: string | null };
export type Usage = { inputTokens: number; outputTokens: number; audioSeconds: number };
/** USD cost of one evaluation, or null when the model has no entered price or a needed price is missing. */
export function costOfUsage(u: Usage, p: ModelPrice | undefined): number | null {
  if (!p) return null;
  const needsAudio = u.audioSeconds > 0 && p.audioPerMin === null;
  const needsTokens = (u.inputTokens > 0 && p.inputPerM === null) || (u.outputTokens > 0 && p.outputPerM === null);
  if (needsAudio && p.inputPerM === null) return null;
  if (needsTokens) return null;
  return u.inputTokens / 1e6 * (p.inputPerM ?? 0) + u.outputTokens / 1e6 * (p.outputPerM ?? 0) + u.audioSeconds / 60 * (p.audioPerMin ?? 0);
}
export const bdt = (usd: number, rate: number | null) => rate === null ? null : usd * rate;
/** Worst case: every credit in the plan used, at the measured average cost per evaluation. null limit = unlimited. */
export function planWorstCase(plan: { priceBdt: number; writingLimit: number | null; speakingLimit: number | null }, avgWritingBdt: number | null, avgSpeakingBdt: number | null) {
  if ((plan.writingLimit === null && avgWritingBdt !== null) || (plan.speakingLimit === null && avgSpeakingBdt !== null)) return { costBdt: null, marginBdt: null, unlimited: true };
  if (avgWritingBdt === null && (plan.writingLimit ?? 0) > 0 || avgSpeakingBdt === null && (plan.speakingLimit ?? 0) > 0) return { costBdt: null, marginBdt: null, unlimited: false };
  const cost = (plan.writingLimit ?? 0) * (avgWritingBdt ?? 0) + (plan.speakingLimit ?? 0) * (avgSpeakingBdt ?? 0);
  return { costBdt: cost, marginBdt: plan.priceBdt - cost, unlimited: false };
}
/** How many evaluations of each kind a budget supports, so unlimited can be sized against real cost. */
export function breakEvenSpeaking(priceBdt: number, writingBdt: number, avgSpeakingBdt: number | null) {
  return avgSpeakingBdt && avgSpeakingBdt > 0 ? Math.max(0, Math.floor((priceBdt - writingBdt) / avgSpeakingBdt)) : null;
}
/** Prefer the cost the provider reported for that call; otherwise use the entered price table. */
export function pickCost(reportedUsd: number | null, computedUsd: number | null): { usd: number; measured: boolean } | null {
  if (reportedUsd !== null && Number.isFinite(reportedUsd) && reportedUsd >= 0) return { usd: reportedUsd, measured: true };
  return computedUsd === null ? null : { usd: computedUsd, measured: false };
}
