import Link from 'next/link';
import { Search } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/auth/db';
import { PlansBoard } from '@/components/admin/plans-board';
import { RequestActions } from '@/components/admin/request-actions';
import { Badge, Card, CardTitle, PageHeader, PersonCell, Stat, dhaka, taka } from '@/components/admin/ui';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  await requireAdmin();
  const search = String((await searchParams).search ?? '').trim().slice(0, 254);
  const sql = db();
  const [plans, free, requests, totals] = await Promise.all([
    sql.query(`SELECT p.*,(SELECT count(*)::int FROM public.evaluation_subscriptions s WHERE s.plan_id=p.id AND s.status='active' AND s.expires_at>now()) AS members FROM public.evaluation_plans p ORDER BY p.published DESC,p.price_bdt,p.name`),
    sql.query('SELECT free_writing,free_speaking FROM public.evaluation_policy WHERE id=true').then(r => r[0]),
    sql.query(`SELECT s.id,s.user_id,s.plan_name,s.price_bdt,s.status,s.created_at,s.starts_at,s.expires_at,u.name,u.email FROM public.evaluation_subscriptions s JOIN app_auth.users u ON u.id=s.user_id WHERE ($1='' OR strpos(lower(u.email),lower($1))>0 OR strpos(lower(u.name),lower($1))>0) ORDER BY (s.status='pending') DESC,s.created_at DESC LIMIT 60`, [search]),
    sql.query(`SELECT count(*) FILTER(WHERE status='pending')::int pending,count(*) FILTER(WHERE status='active' AND expires_at>now())::int active,coalesce(sum(price_bdt) FILTER(WHERE starts_at>=date_trunc('month',now() AT TIME ZONE 'Asia/Dhaka') AT TIME ZONE 'Asia/Dhaka'),0)::int month_value FROM public.evaluation_subscriptions`).then(r => r[0]),
  ]);
  const th = 'px-4 py-3 text-left text-[12px] font-medium text-muted';
  return (
    <div>
      <PageHeader title="Plans" sub="Prices, monthly AI limits and plan requests" />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Active members" value={totals.active} />
        <Stat label="Pending requests" value={totals.pending} />
        <Stat label="Activated this month" value={taka(totals.month_value)} sub="At listed plan prices" />
      </div>
      <PlansBoard plans={plans as any} free={free as any} />
      <Card className="mt-6 !p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-4">
          <CardTitle title="Requests and members" hint="Pending requests come first. To give a plan directly, open the person's profile." />
          <div className="flex items-center gap-3">
            <form action="/admin/subscriptions" className="flex items-center gap-2 rounded-xl border border-line bg-bg px-3">
              <Search size={15} aria-hidden="true" className="text-muted" />
              <input type="search" name="search" defaultValue={search} placeholder="Search name or email" aria-label="Search requests" className="h-10 w-52 border-0 bg-transparent text-[13px] outline-none" />
            </form>
            <a href="/api/admin/payments/export" className="text-[13px] text-muted no-underline hover:text-ink">Export CSV</a>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead><tr className="border-y border-line"><th className={th}>Person</th><th className={th}>Plan</th><th className={th}>Status</th><th className={th}>Dates</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {requests.map((r: any) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3"><PersonCell id={r.user_id} name={r.name} email={r.email} /></td>
                  <td className="px-4 py-3 text-[13px]"><span className="font-medium text-ink">{r.plan_name}</span><span className="block text-[12px] text-muted">{taka(r.price_bdt)}</span></td>
                  <td className="px-4 py-3"><Badge tone={r.status === 'active' ? 'good' : r.status === 'pending' ? 'info' : 'neutral'}>{r.status === 'active' && new Date(r.expires_at) <= new Date() ? 'expired' : r.status}</Badge></td>
                  <td className="px-4 py-3 text-[13px] text-muted">{r.starts_at ? `${dhaka(r.starts_at)} to ${dhaka(r.expires_at)}` : 'Requested ' + dhaka(r.created_at)}</td>
                  <td className="px-4 py-3"><RequestActions id={r.id} status={r.status === 'active' && new Date(r.expires_at) <= new Date() ? 'expired' : r.status} /></td>
                </tr>
              ))}
              {!requests.length && <tr><td colSpan={5} className="px-4 py-12 text-center text-[13px] text-muted">{search ? 'No match for this search.' : 'No requests yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
