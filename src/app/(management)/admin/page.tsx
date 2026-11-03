import {requireAdmin} from '@/lib/auth/guards';
import {adminSalesOverview} from '@/lib/admin/overview';
import Link from 'next/link';
import { WorkspaceHeading } from '@/components/page-parts';
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
 const cards=[
  ['Users',rows.users,'/admin/users'],['New users today',rows.users_today,'/admin/users'],
  ['Cambridge books',rows.cambridge_books,'/admin/cambridge'],['Cambridge tests',rows.cambridge_tests,'/admin/cambridge'],
  ['More Books tests',rows.more_books,'/admin/other-books'],['Recent Tests',rows.recent_tests,'/admin/recent-tests'],
  ['Active users · 24h',rows.active_users,'/admin/users'],['Speaking tests',rows.speaking_tests,'/admin/speaking-tests'],['Learning resources',rows.resources,'/admin/resources'],['Vocabulary entries',rows.vocabulary,'/admin/vocabulary'],
  ['Mock exams',rows.mocks,'/admin/mocks'],['Question items',rows.questions,'/admin/recent-tests'],
 ] as const;
 return <div className="admin-refactor"><WorkspaceHeading eyebrow="ADMIN" title="Overview"  />
  <div className="adm-quick-actions"><Link className="button" href="/admin/cambridge">Manage Cambridge</Link><Link className="button outline" href="/admin/mocks/new">Create mock</Link><Link className="button outline" href="/admin/import">Import tests</Link><Link className="button outline" href="/admin/resources">Manage resources</Link></div>
  <section className="adm-sales-overview"><div className="adm-section-heading"><div><h2>Sales & subscriptions</h2><p>Activated subscription values · recorded plan prices in BDT</p></div><Link className="button" href="/admin/subscriptions">Manage sales & plans ↗</Link></div><div className="admin-kpi-grid">{[['Activated plan value',money(sales.totals.activated_value)],['This month',money(sales.totals.month_value)],['Customers',sales.totals.buyers],['Total activations',sales.totals.activations],['Activated today',sales.totals.today_activations],['Active memberships',sales.totals.active],['Pending requests',sales.totals.pending],['Expired memberships',sales.totals.expired]].map(([label,value])=><div className="admin-kpi" key={String(label)}><span>{label}</span><strong>{String(value??0)}</strong></div>)}</div><p className="adm-note">Pending request value: {money(sales.totals.pending_value)}. These totals reflect activated plans, not independently verified payment receipts.</p><div className="adm-overview-columns"><section className="workspace-panel"><h3>Plan performance</h3><div className="table-scroll"><table className="adm-data-table"><thead><tr><th>Plan</th><th>Customers</th><th>Activations</th><th>Value</th></tr></thead><tbody>{sales.plans.map((p:any)=><tr key={p.plan_name}><td>{p.plan_name}</td><td>{p.buyers}</td><td>{p.activations}</td><td>{money(p.value)}</td></tr>)}{!sales.plans.length&&<tr><td colSpan={4}>No activated subscriptions yet.</td></tr>}</tbody></table></div></section><section className="workspace-panel"><h3>Last 7 days</h3><div className="adm-daily-sales">{sales.days.map((d:any)=><div key={d.label}><span>{d.label}</span><strong>{d.activations} activations</strong><span>{money(d.value)}</span></div>)}</div></section></div><section className="workspace-panel"><h3>Recent subscription requests</h3><div className="table-scroll"><table className="adm-data-table"><thead><tr><th>Customer</th><th>Plan</th><th>Value</th><th>Status</th><th>Manage</th></tr></thead><tbody>{sales.recent.map((r:any)=><tr key={r.id}><td><Link href={'/admin/users/'+r.user_id}>{r.name}</Link><small>{r.email}</small></td><td>{r.plan_name}</td><td>{money(r.price_bdt)}</td><td>{r.status}</td><td><Link href={'/admin/subscriptions?search='+encodeURIComponent(r.email)}>Open ↗</Link></td></tr>)}{!sales.recent.length&&<tr><td colSpan={5}>No subscription requests yet.</td></tr>}</tbody></table></div></section></section>
  <div className="adm-section-heading"><h2>Content & operations</h2></div><div className="admin-kpi-grid">{cards.map(([label,value,href])=><Link href={href} className="admin-kpi" key={label}><span>{label}</span><strong>{Number(value||0).toLocaleString('en-US')}</strong></Link>)}</div>
  <section aria-labelledby="review-title"><h2 id="review-title">Needs attention</h2><div className="adm-operations">{[
   ['Mock results to review',rows.results_pending,'/admin/results'],['Writing jobs queued',rows.writing_pending,'/admin/ai-operations'],['Subscription requests',rows.subscriptions_pending,'/admin/subscriptions'],['Speaking jobs queued',rows.speaking_pending,'/admin/ai-operations'],['Failed AI evaluations',rows.ai_failed,'/admin/ai-operations'],['Draft resources',rows.resources_draft,'/admin/resources'],
  ].map(([label,count,href])=><Link className="adm-operation" href={String(href)} key={String(href)}><span>{label}</span><strong>{Number(count||0).toLocaleString('en-US')}</strong></Link>)}</div></section>
 </div>;
}
