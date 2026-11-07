import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/auth/db';
import { PageHeader } from '@/components/admin/ui';
import { CouponsBoard } from '@/components/admin/coupons-board';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Coupon codes' };
export default async function Page() {
  await requireAdmin();
  const sql = db();
  const [coupons, plans] = await Promise.all([
    sql.query(`SELECT c.id,c.code,c.kind,c.value,c.plan_id,p.name AS plan_name,c.max_uses,c.expires_at,c.active,c.note,
      (SELECT count(*)::int FROM public.evaluation_subscriptions s WHERE s.coupon_code=c.code AND s.status<>'rejected' AND NOT(s.status='cancelled' AND s.starts_at IS NULL)) AS used
      FROM public.coupons c LEFT JOIN public.evaluation_plans p ON p.id=c.plan_id ORDER BY c.created_at DESC LIMIT 200`),
    sql.query('SELECT id,name FROM public.evaluation_plans ORDER BY published DESC,price_bdt,name'),
  ]);
  return (
    <div>
      <PageHeader title="Coupon codes" sub="Discounts members can enter at checkout" />
      <CouponsBoard coupons={coupons as any} plans={plans as any} />
    </div>
  );
}
