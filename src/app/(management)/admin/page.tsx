import Link from "next/link";
import { WorkspaceHeading } from "@/components/page-parts";
import { db } from "@/lib/auth/db";
import { listCambridgeTests } from "@/lib/cambridge";
export const dynamic = "force-dynamic";
export default async function Page(){
 const [cambridge,users,inventory,mocks,evaluations] = await Promise.all([
  listCambridgeTests(false),
  db().query("SELECT count(*)::int total,count(*) FILTER(WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'Asia/Dhaka') AT TIME ZONE 'Asia/Dhaka')::int today FROM app_auth.users"),
  db().query(`SELECT
    (SELECT count(*)::int FROM public.admin_content WHERE kind='practice' AND book_slug IS NULL) AS independent,
    (SELECT count(*)::int FROM public.admin_content WHERE kind='practice' AND book_slug IS NOT NULL) AS more_books,
    (SELECT count(*)::int FROM public.admin_content WHERE kind='mock') AS mocks,
    (SELECT count(*)::int FROM public.exam_modules) AS modules,
    (SELECT coalesce(sum(jsonb_array_length(document->'questions')),0)::int FROM public.exam_modules WHERE jsonb_typeof(document->'questions')='array') AS questions`),
  db().query("SELECT count(*)::int scheduled,count(*) FILTER(WHERE results_published_at IS NULL AND ends_at<=now())::int awaiting_review FROM public.mock_events"),
  db().query("SELECT count(*)::int total,count(*) FILTER(WHERE status IN ('pending','running'))::int pending FROM public.writing_evaluations")
 ]);
 const numbers=inventory[0]||{}, events=mocks[0]||{}, jobs=evaluations[0]||{};
 const cards=[
  ["Total users",Number(users[0]?.total||0),"/admin/users"],
  ["New users today",Number(users[0]?.today||0),"/admin/users"],
  ["Cambridge books",new Set(cambridge.map(t=>t.bookNumber)).size,"/admin/cambridge"],
  ["Cambridge tests",cambridge.length,"/admin/cambridge"],
  ["More Books tests",Number(numbers.more_books||0),"/admin/other-books"],
  ["Independent Practice",Number(numbers.independent||0),"/admin/practice"],
  ["Question items",Number(numbers.questions||0),"/admin/practice"],
  ["Exam modules",Number(numbers.modules||0),"/admin/practice"],
  ["Mock exams",Number(numbers.mocks||0),"/admin/mocks"],
  ["Mock results awaiting review",Number(events.awaiting_review||0),"/admin/results"],
  ["Writing jobs in queue",Number(jobs.pending||0),"/admin/ai-operations"]
 ] as const;
 return <div className="admin-refactor"><WorkspaceHeading eyebrow="BUSINESS DASHBOARD" title="Platform overview" description="Live inventory, learners, evaluation operations and mock review. Values come directly from PostgreSQL."/>
  <div className="admin-kpi-grid">{cards.map(([label,value,href])=><Link href={href} className="admin-kpi" key={label}><span>{label}</span><strong>{value.toLocaleString()}</strong><small>View details ↗</small></Link>)}</div>
  <section className="workspace-panel admin-business-note"><h2>Revenue & purchases</h2><p>Payment provider is not connected. Today's purchases and revenue are unavailable—not zero. Transaction verification and payment history require an approved gateway connection.</p><Link href="/admin/subscriptions">Manage plans & manual subscriptions ↗</Link></section>
  <section className="workspace-panel admin-business-note"><h2>Operational overview</h2><p>{Number(events.scheduled||0)} scheduled mock events · {Number(jobs.total||0)} Writing evaluation jobs recorded.</p><Link href="/admin/results">Review mock results ↗</Link> · <Link href="/admin/activity">Audit activity ↗</Link></section>
 </div>;
}
