import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { WorkspaceHeading } from '@/components/page-parts';
import { db } from '@/lib/auth/db';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Payments ledger' };
const STATUS = ['pending', 'active', 'cancelled', 'rejected'];
export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireAdmin();
  const q = await searchParams, status = STATUS.includes(String(q.status)) ? String(q.status) : '';
  const page = Math.min(10000, Math.max(1, Number.isInteger(Number(q.page)) ? Number(q.page) : 1));
  const [[t], rows] = await Promise.all([
    db().query(`SELECT count(*)::int n,coalesce(sum(price_bdt) FILTER(WHERE status='active' OR (status='cancelled' AND starts_at IS NOT NULL)),0)::bigint activated FROM public.evaluation_subscriptions WHERE ($1='' OR status=$1)`, [status]),
    db().query(`SELECT s.id,s.user_id,u.email,s.plan_name,s.price_bdt,s.status,s.created_at,s.starts_at,s.expires_at FROM public.evaluation_subscriptions s JOIN app_auth.users u ON u.id=s.user_id WHERE ($1='' OR s.status=$1) ORDER BY s.created_at DESC LIMIT 50 OFFSET $2::int`, [status, (page - 1) * 50]),
  ]);
  const href = (p: number, s = status) => '/admin/payments?' + new URLSearchParams({ ...(s ? { status: s } : {}), page: String(p) });
  const date = (d: unknown) => d ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' }).format(new Date(String(d))) : '—';
  return <div className="admin-refactor"><WorkspaceHeading eyebrow="PEOPLE / PAYMENTS" title="Payments ledger" />
    <p className="adm-callout">This ledger lists plan requests and activations at their recorded price. It is not a bank or gateway reconciliation; receipts are not verified here.</p>
    <nav className="adm-segment" aria-label="Status"><Link href={href(1, '')} aria-current={!status ? 'true' : undefined}>All</Link>{STATUS.map(s => <Link key={s} href={href(1, s)} aria-current={status === s ? 'true' : undefined}>{s}</Link>)}<a className="adm-segment-end" href={'/api/admin/payments/export' + (status ? '?status=' + status : '')}>Download CSV</a></nav>
    <section className="workspace-panel"><div className="table-scroll"><table className="adm-data-table"><thead><tr><th>Requested</th><th>Account</th><th>Plan</th><th>Price</th><th>Status</th><th>Active until</th></tr></thead><tbody>
      {rows.map((r: any) => <tr key={r.id}><td>{date(r.created_at)}</td><td><Link href={'/admin/users/' + r.user_id}>{r.email}</Link></td><td>{r.plan_name}</td><td>৳{Number(r.price_bdt).toLocaleString('en-US')}</td><td>{r.status}</td><td>{date(r.expires_at)}</td></tr>)}
      {!rows.length && <tr><td colSpan={6}>No plan requests{status ? ' with status ' + status : ''}.</td></tr>}</tbody></table></div>
      <div className="admin-pagination"><span>{t.n} records · ৳{Number(t.activated).toLocaleString('en-US')} activated</span><div>{page > 1 && <Link href={href(page - 1)}>← Previous</Link>}{page * 50 < t.n && <Link href={href(page + 1)}>Next →</Link>}</div></div></section></div>;
}
