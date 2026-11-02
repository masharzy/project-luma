import Link from 'next/link';
import { WorkspaceHeading } from '@/components/page-parts';
import { db } from '@/lib/auth/db';
export const dynamic='force-dynamic';
export default async function Page() {
 const [rows]=await db().query(`SELECT
  (SELECT count(*)::int FROM app_auth.users) users,
  (SELECT count(*)::int FROM app_auth.users WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'Asia/Dhaka') AT TIME ZONE 'Asia/Dhaka') users_today,
  (SELECT count(*)::int FROM public.cambridge_books) cambridge_books,
  (SELECT count(*)::int FROM public.cambridge_tests) cambridge_tests,
  (SELECT count(*)::int FROM public.admin_content WHERE kind='practice' AND book_slug IS NOT NULL) more_books,
  (SELECT count(*)::int FROM public.admin_content WHERE kind='practice' AND book_slug IS NULL) practice,
  (SELECT count(*)::int FROM public.mock_events) mocks,
  (SELECT coalesce(sum(jsonb_array_length(document->'questions')),0)::int FROM public.exam_modules WHERE jsonb_typeof(document->'questions')='array') questions,
  (SELECT count(*)::int FROM public.mock_events WHERE results_published_at IS NULL AND ends_at<=now()) results_pending,
  (SELECT count(*)::int FROM public.writing_evaluations WHERE status IN ('pending','running')) writing_pending,
  (SELECT count(*)::int FROM public.evaluation_subscriptions WHERE status='pending') subscriptions_pending`);
 const cards=[
  ['Users',rows.users,'/admin/users'],['New users today',rows.users_today,'/admin/users'],
  ['Cambridge books',rows.cambridge_books,'/admin/cambridge'],['Cambridge tests',rows.cambridge_tests,'/admin/cambridge'],
  ['More Books tests',rows.more_books,'/admin/other-books'],['Practice tests',rows.practice,'/admin/practice'],
  ['Mock exams',rows.mocks,'/admin/mocks'],['Question items',rows.questions,'/admin/practice'],
 ] as const;
 return <div className="admin-refactor"><WorkspaceHeading eyebrow="ADMIN" title="Overview" description="Tests, learners and work awaiting review." />
  <div className="adm-quick-actions"><Link className="button" href="/admin/cambridge">Manage Cambridge</Link><Link className="button outline" href="/admin/mocks/new">Create mock</Link><Link className="button outline" href="/admin/import">Import tests</Link><Link className="button outline" href="/admin/resources">Manage resources</Link></div>
  <div className="admin-kpi-grid">{cards.map(([label,value,href])=><Link href={href} className="admin-kpi" key={label}><span>{label}</span><strong>{Number(value||0).toLocaleString('en-US')}</strong></Link>)}</div>
  <section aria-labelledby="review-title"><h2 id="review-title">Needs attention</h2><div className="adm-operations">{[
   ['Mock results to review',rows.results_pending,'/admin/results'],['Writing jobs queued',rows.writing_pending,'/admin/ai-operations'],['Subscription requests',rows.subscriptions_pending,'/admin/subscriptions'],
  ].map(([label,count,href])=><Link className="adm-operation" href={String(href)} key={String(href)}><span>{label}</span><strong>{Number(count||0).toLocaleString('en-US')}</strong></Link>)}</div></section>
 </div>;
}
