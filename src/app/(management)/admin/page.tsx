import {requireAdmin} from '@/lib/auth/guards';
import {adminSalesOverview} from '@/lib/admin/overview';
import Link from 'next/link';
import { Card, CardTitle, PageHeader, Stat, PersonCell, Badge, dhaka } from '@/components/admin/ui';
import { db } from '@/lib/auth/db';
export const dynamic='force-dynamic';
export default async function Page() {
 await requireAdmin();
 const [rows]=await db().query(`SELECT
  (SELECT count(*)::int FROM app_auth.users) users,
  (SELECT count(*)::int FROM app_auth.users WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'Asia/Dhaka') AT TIME ZONE 'Asia/Dhaka') users_today,
  (SELECT count(*)::int FROM public.cambridge_books) cambridge_books,
  (SELECT count(*)::int FROM public.cambridge_tests) cambridge_tests,
  (SELECT count(*)::int FROM public.admin_content WHERE kind='practice' AND book_slug IS NOT NULL) more_books,
  (SELECT count(*)::int FROM public.recent_tests) recent_tests,
  (SELECT count(*)::int FROM public.mock_events) mocks,
  (SELECT coalesce(sum(jsonb_array_length(document->'questions')),0)::int FROM public.exam_modules WHERE jsonb_typeof(document->'questions')='array') questions,
  (SELECT count(*)::int FROM public.mock_events WHERE results_published_at IS NULL AND ends_at<=now()) results_pending,
  (SELECT count(*)::int FROM public.writing_evaluations WHERE status IN ('pending','running')) writing_pending,
  (SELECT count(*)::int FROM public.evaluation_subscriptions WHERE status='pending') subscriptions_pending,
  (SELECT count(*)::int FROM public.speaking_sets) speaking_tests,
  (SELECT count(*)::int FROM public.learning_resources) resources,
  (SELECT count(*)::int FROM public.learning_resources WHERE status='draft') resources_draft,
  (SELECT count(*)::int FROM public.admin_content WHERE kind='vocabulary') vocabulary,
  (SELECT count(DISTINCT user_id)::int FROM app_auth.sessions WHERE expires_at>now() AND last_seen_at>now()-interval '24 hours') active_users,
  (SELECT count(*)::int FROM public.speaking_evaluations WHERE status IN ('pending','running')) speaking_pending,
  ((SELECT count(*) FROM public.writing_evaluations WHERE status='failed')+(SELECT count(*) FROM public.speaking_evaluations WHERE status='failed'))::int ai_failed`);
 const sales=await adminSalesOverview();const money=(n:unknown)=>'৳'+Number(n||0).toLocaleString('en-US');
 const num=(n:unknown)=>Number(n||0).toLocaleString('en-US');
 const attention=[
  ['Subscription requests',rows.subscriptions_pending,'/admin/subscriptions'],['Mock results to review',rows.results_pending,'/admin/results'],
  ['Failed AI evaluations',rows.ai_failed,'/admin/ai-operations'],['Queued AI jobs',Number(rows.writing_pending)+Number(rows.speaking_pending),'/admin/ai-operations'],['Draft resources',rows.resources_draft,'/admin/resources'],
 ] as const;
 const content=[
  ['Cambridge tests',rows.cambridge_tests,'/admin/cambridge'],['More Books tests',rows.more_books,'/admin/other-books'],['Recent Tests',rows.recent_tests,'/admin/recent-tests'],
  ['Speaking tests',rows.speaking_tests,'/admin/speaking-tests'],['Mock exams',rows.mocks,'/admin/mocks'],['Question items',rows.questions,'/admin/recent-tests'],
  ['Learning resources',rows.resources,'/admin/resources'],['Vocabulary entries',rows.vocabulary,'/admin/vocabulary'],
 ] as const;
 const peak=Math.max(1,...sales.days.map((d:any)=>Number(d.value)));
 const pill='rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink no-underline hover:bg-soft';
 return <div>
  <PageHeader title="Overview" actions={<div className="flex flex-wrap gap-2"><Link className={pill} href="/admin/cambridge">Cambridge</Link><Link className={pill} href="/admin/mocks/new">New mock</Link><Link className={pill} href="/admin/import">Import tests</Link></div>} />
  <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
   <Stat label="Accounts" value={num(rows.users)} sub={`${num(rows.users_today)} today`} />
   <Stat label="Active in 24 hours" value={num(rows.active_users)} />
   <Stat label="Active memberships" value={num(sales.totals.active)} sub={`${num(sales.totals.expired)} expired`} />
   <Stat label="Revenue this month" value={money(sales.totals.month_value)} sub={`${money(sales.totals.activated_value)} in total`} />
  </div>
  <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
   {attention.map(([label,count,href])=><Link key={label} href={href} className={`rounded-card border px-4 py-3 no-underline ${Number(count)>0?'border-transparent bg-warn-soft':'border-line bg-surface'}`}><span className={`block text-[12px] ${Number(count)>0?'text-warn':'text-muted'}`}>{label}</span><strong className={`block text-[22px] font-semibold tabular-nums ${Number(count)>0?'text-warn':'text-ink'}`}>{num(count)}</strong></Link>)}
  </div>
  <div className="mb-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
   <Card><CardTitle title="Recent plan requests" hint="Activated and pending, newest first." action={<Link href="/admin/subscriptions" className="text-[13px] text-muted no-underline hover:text-ink">All plans</Link>} />
    <ul className="m-0 grid list-none gap-1 p-0">{sales.recent.map((r:any)=><li key={r.id} className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0"><PersonCell id={r.user_id} name={r.name} email={r.email} /><span className="flex shrink-0 items-center gap-3 text-[13px]"><span className="hidden text-muted sm:inline">{r.plan_name} · {money(r.price_bdt)}</span><Badge tone={r.status==='active'?'good':r.status==='pending'?'info':'neutral'}>{r.status}</Badge></span></li>)}
     {!sales.recent.length&&<li className="py-6 text-center text-[13px] text-muted">No plan requests yet.</li>}</ul></Card>
   <Card><CardTitle title="Last 7 days" hint="Plan value activated per day." />
    <div className="flex h-36 items-end gap-2" role="img" aria-label="Plan value activated in the last 7 days">{sales.days.map((d:any)=><div key={d.label} className="flex flex-1 flex-col items-center gap-1.5"><div className="flex w-full flex-1 items-end"><div className="w-full rounded-t-md bg-ink" style={{height:Math.max(3,Number(d.value)/peak*100)+'%',opacity:Number(d.value)?1:.15}} title={`${d.label}: ${money(d.value)}`} /></div><span className="text-[11px] text-muted">{d.label.slice(0,6)}</span></div>)}</div>
    {sales.plans.length>0&&<div className="mt-5 border-t border-line pt-3">{sales.plans.map((p:any)=><div key={p.plan_name} className="flex justify-between py-1 text-[13px]"><span className="text-ink">{p.plan_name}</span><span className="tabular-nums text-muted">{p.activations} · {money(p.value)}</span></div>)}</div>}</Card>
  </div>
  <Card><CardTitle title="Content" />
   <div className="grid grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-4">{content.map(([label,value,href])=><Link key={label} href={href} className="flex items-baseline justify-between gap-2 rounded-lg px-2 py-2 text-ink no-underline hover:bg-soft"><span className="text-[13px] text-muted">{label}</span><strong className="text-[15px] font-semibold tabular-nums">{num(value)}</strong></Link>)}</div></Card>
 </div>;
}
