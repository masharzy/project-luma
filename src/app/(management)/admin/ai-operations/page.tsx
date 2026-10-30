import Link from "next/link";
import {WorkspaceHeading} from "@/components/page-parts";
import {db} from "@/lib/auth/db";
export const dynamic="force-dynamic";
export const metadata={title:"AI evaluation operations"};
export default async function Page(){
 const [writing,speaking,counts]=await Promise.all([
  db().query(`SELECT w.id::text,w.status,w.tries,w.error_code,w.created_at,w.updated_at,u.email,
   'Writing' AS skill FROM public.writing_evaluations w LEFT JOIN app_auth.users u ON u.id=w.user_id ORDER BY w.updated_at DESC LIMIT 75`),
  db().query(`SELECT s.id::text,s.status,s.tries,s.error_code,s.created_at,s.updated_at,u.email,
   'Speaking' AS skill FROM public.speaking_evaluations s LEFT JOIN app_auth.users u ON u.id=s.user_id ORDER BY s.updated_at DESC LIMIT 75`),
  db().query(`SELECT (SELECT count(*)::int FROM public.writing_evaluations WHERE status='pending') AS writing_queued,
   (SELECT count(*)::int FROM public.writing_evaluations WHERE status='failed') AS writing_failed,
   (SELECT count(*)::int FROM public.speaking_evaluations WHERE status='pending') AS speaking_queued,
   (SELECT count(*)::int FROM public.speaking_evaluations WHERE status='failed') AS speaking_failed`)
 ]);
 const c=counts[0]||{};
 const jobs=[...writing,...speaking].sort((a,b)=>new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime()).slice(0,100);
 return <div className="admin-refactor"><WorkspaceHeading eyebrow="AI / OPERATIONS" title="Evaluation job monitoring" description="Inspect recent Writing and Speaking jobs without exposing learner answers, audio recordings or provider credentials."/>
  <div className="admin-kpi-grid">{[["Writing pending",c.writing_queued],["Writing failed",c.writing_failed],["Speaking pending",c.speaking_queued],["Speaking failed",c.speaking_failed]].map(([k,v])=><div className="admin-kpi" key={String(k)}><span>{k}</span><strong>{Number(v||0)}</strong></div>)}</div>
  <section className="workspace-panel"><h2>Recent evaluation jobs</h2><p>Automatic retries and refunds are handled by the queue workers. Failed jobs are shown here for investigation; this page does not automatically re-charge users.</p>
  <div className="table-scroll"><table className="admin-users-table"><thead><tr><th>SKILL</th><th>ACCOUNT</th><th>STATUS</th><th>TRIES</th><th>ERROR CODE</th><th>UPDATED (BD)</th></tr></thead><tbody>{jobs.map(j=><tr key={j.skill+":"+j.id}><td>{j.skill}</td><td>{j.email||"Deleted account"}</td><td>{j.status}</td><td>{Number(j.tries||0)}</td><td>{j.error_code||"—"}</td><td>{new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Dhaka"}).format(new Date(j.updated_at))}</td></tr>)}{!jobs.length&&<tr><td colSpan={6}>No evaluation jobs yet.</td></tr>}</tbody></table></div></section>
  <Link href="/admin/ai-lab">Benchmark & configure providers ↗</Link>
 </div>;
}
