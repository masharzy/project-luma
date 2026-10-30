import 'server-only';
import { db } from '@/lib/auth/db';
export async function publicPlans(){return db().query('SELECT id,name,description,price_bdt,writing_limit,speaking_limit FROM public.evaluation_plans WHERE published=true ORDER BY price_bdt,name');}
export async function freePolicy(){return (await db().query('SELECT free_writing,free_speaking FROM public.evaluation_policy WHERE id=true'))[0];}
export async function membership(userId:string){
 const [allowances,subscriptions]=await Promise.all([
 db().query(`SELECT p.product,a.monthly_limit,a.source,coalesce(u.count,0)+CASE WHEN p.product='writing_product' THEN coalesce((SELECT sum(count) FROM public.evaluation_usage WHERE user_id=$1 AND product IN ('cambridge_writing','practice_writing') AND period=date_trunc('month',now() AT TIME ZONE 'UTC')::date),0) ELSE 0 END AS used FROM (VALUES ('writing_product'),('speaking_product')) p(product) CROSS JOIN LATERAL public.evaluation_allowance($1::uuid,p.product) a LEFT JOIN public.evaluation_usage u ON u.user_id=$1 AND u.product=p.product AND u.period=date_trunc('month',now() AT TIME ZONE 'UTC')::date`,[userId]),
 db().query('SELECT id,plan_name,price_bdt,writing_limit,speaking_limit,status,starts_at,expires_at,created_at FROM public.evaluation_subscriptions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',[userId])]);
 return {allowances,subscriptions};
}
// The row in evaluation_usage serializes concurrent reservations. Previous Cambridge
// usage counts toward the shared Writing product without rewriting old jobs/refunds.
export const legacyWritingUsage = `(CASE WHEN $2::text='writing_product' THEN coalesce((SELECT sum(count) FROM public.evaluation_usage WHERE user_id=$1::uuid AND product IN ('cambridge_writing','practice_writing') AND period=date_trunc('month',now() AT TIME ZONE 'UTC')::date),0) ELSE 0 END)`;
