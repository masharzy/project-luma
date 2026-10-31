// The current admin stores free allowances separately from paid evaluation plans.
// Keep the presentation adapter independent of database access for count/edge-case QA.
export type DisplayPlan = {
  id: string; slug: string; name: string; tagline?: string; price: number;
  period: 'month' | '30 days'; writingCredits: number | null; speakingCredits: number | null;
  features: string[]; recommended: boolean; isFree: boolean; isActive: boolean; sortOrder: number;
};
export type PlanRecord = Record<string, unknown>;
const count = (v: unknown): number | null => v === null ? null : Math.max(0, Number(v) || 0);
export function presentPlans(records: PlanRecord[], policy: PlanRecord) {
  let recommendedUsed = false;
  const plans: DisplayPlan[] = records.map((p, i) => {
    const writing = count(p.writing_limit), speaking = count(p.speaking_limit);
    const description = String(p.description ?? '').trim();
    const suppliedFeatures = Array.isArray(p.features) ? p.features.filter((f): f is string => typeof f === 'string' && !!f.trim()) : [];
    // Derived from the actual product capabilities, never from the prototype's sample plans.
    const features = suppliedFeatures.length ? suppliedFeatures : [
      ...(writing !== 0 ? ['Task 1 and Task 2 Writing evaluation'] : []),
      ...(speaking !== 0 ? ['Speaking feedback and audio playback'] : []),
      'Past feedback saved in your account',
    ];
    return { id: String(p.id), slug: String(p.slug || p.id), name: String(p.name),
      tagline: String(p.tagline ?? description) || undefined, price: Math.max(0, Number(p.price_bdt) || 0),
      period: p.period === 'month' ? 'month' as const : '30 days' as const,
      writingCredits: writing, speakingCredits: speaking, features,
      recommended: p.recommended === true, isFree: p.is_free === true || p.name === 'Free' && Number(p.price_bdt) === 0,
      isActive: p.published === true && p.is_active !== false, sortOrder: Number(p.sort_order ?? i),
    };
  }).filter(p => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const free = plans.find(p => p.isFree);
  const paid = plans.filter(p => !p.isFree).map(p => {
    const recommended = p.recommended && !recommendedUsed;
    if (recommended) recommendedUsed = true;
    return { ...p, recommended };
  });
  return { paid, free: {
    writingCredits: free ? free.writingCredits : count(policy.free_writing),
    speakingCredits: free ? free.speakingCredits : count(policy.free_speaking),
  } };
}
export const creditText = (n: number | null) => n === null ? 'Unlimited' : n.toLocaleString('en-US');
export function creditPercent(value: number | null, values: (number | null)[]) {
  if (value === null) return 100;
  const largest = Math.max(0, ...values.map(n => n ?? 0));
  return largest ? value / largest * 100 : 0;
}
