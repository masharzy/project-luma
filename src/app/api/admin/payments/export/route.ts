import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/auth/db';
export const dynamic = 'force-dynamic';
const cell = (v: unknown) => { let s = v === null || v === undefined ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
export async function GET(req: Request) {
  await requireAdmin();
  const status = new URL(req.url).searchParams.get('status') ?? '';
  const rows = await db().query(`SELECT s.created_at,u.email,s.plan_name,s.price_bdt,s.status,s.starts_at,s.expires_at FROM public.evaluation_subscriptions s JOIN app_auth.users u ON u.id=s.user_id WHERE ($1='' OR s.status=$1) ORDER BY s.created_at DESC LIMIT 20000`, [['pending', 'active', 'cancelled', 'rejected'].includes(status) ? status : '']);
  const body = ['requested,email,plan,price_bdt,status,starts,expires', ...rows.map(r => [r.created_at, r.email, r.plan_name, r.price_bdt, r.status, r.starts_at, r.expires_at].map(cell).join(','))].join('\n');
  return new Response(body, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="payments.csv"', 'cache-control': 'no-store' } });
}
