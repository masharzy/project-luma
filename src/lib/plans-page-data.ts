import 'server-only';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/auth/db';
import { freePolicy } from '@/lib/products/plans';
import { presentPlans } from '@/lib/plan-presentation';

export const getPlansPageData = unstable_cache(async () => {
  const [records, policy] = await Promise.all([
    db().query('SELECT * FROM public.evaluation_plans WHERE published=true ORDER BY price_bdt,name,id'),
    freePolicy(),
  ]);
  return presentPlans(records, policy);
}, ['plans-reference-v1'], { revalidate: 60, tags: ['evaluation-plans'] });
