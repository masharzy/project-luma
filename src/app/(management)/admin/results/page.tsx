import Link from "next/link";
import {WorkspaceHeading} from "@/components/page-parts";
import {AdminResultActions} from "@/components/admin-result-actions";
import {db} from "@/lib/auth/db";
export const dynamic="force-dynamic";
export const metadata={title:"Mock results and publication"};
type Row={id:string;title:string;starts_at:string;ends_at:string;results_published_at:string|null;registrations:number;completed:number;blocking:number};
export default async function Page(){
 const rows=await db().query(`SELECT e.id::text,e.title,e.starts_at,e.ends_at,e.results_published_at,
  (SELECT count(*)::int FROM public.mock_registrations r WHERE r.mock_id=e.id) AS registrations,
  (SELECT count(*)::int FROM public.exam_attempts a WHERE a.kind='mock' AND a.parent_id=e.id AND a.current_index>=jsonb_array_length(a.snapshot)) AS completed,
  (SELECT count(*)::int FROM public.exam_attempts a WHERE a.kind='mock' AND a.parent_id=e.id
   AND (a.current_index<jsonb_array_length(a.snapshot) OR EXISTS(
    SELECT 1 FROM jsonb_array_elements(a.snapshot) s
    WHERE s->>'module' IN ('writing','speaking')
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(a.results) v WHERE v->>'module'=s->>'module' AND v->>'status' IN ('reviewed','ai_reviewed'))))) AS blocking
  FROM public.mock_events e ORDER BY e.starts_at DESC LIMIT 100`) as Row[];
 const pending=rows.filter(r=>!r.results_published_at);
 const fmt=(s:string)=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Dhaka'}).format(new Date(s));
 return <div className="admin-refactor"><WorkspaceHeading eyebrow="EXAMS / RESULTS" title="Review & publish results" description="Review mock evaluations, resolve outstanding work, then publish each mock to all its candidates. Publication remains admin-only."/>
  <div className="admin-kpi-grid"><div className="admin-kpi"><span>Mock events</span><strong>{rows.length}</strong></div><div className="admin-kpi"><span>Unpublished events</span><strong>{pending.length}</strong></div><div className="admin-kpi"><span>Awaiting review</span><strong>{pending.filter(r=>r.blocking>0).length}</strong></div></div>
  <section className="workspace-panel"><h2>Result releases</h2>{!rows.length&&<p>No scheduled mock events yet. Create one from <Link href="/admin/mocks">Mock Exams</Link>.</p>}
  <div className="admin-item-grid">{rows.map(r=>{
    const ready=!r.results_published_at&&new Date(r.ends_at).getTime()<=Date.now()&&Number(r.blocking)===0;
    return <article className="workspace-panel admin-item-card" key={r.id}><span className="access-pill">{r.results_published_at?'Published':ready?'Ready to publish':'Review pending'}</span><h3>{r.title}</h3><p>Ended: {fmt(r.ends_at)}</p><p>{r.registrations} registered · {r.completed} completed · {r.blocking} blocking publication</p>{r.results_published_at&&<p>Published: {fmt(r.results_published_at)}</p>}<div className="admin-item-meta"><Link className="button button-outline" href={"/admin/mocks/"+r.id}>Review candidates ↗</Link>{!r.results_published_at&&<AdminResultActions id={r.id} ready={ready}/>}</div></article>;
   })}</div></section>
  <p className="security-note">Results are published per mock, not indiscriminately across separate exams. The server rechecks deadline, completion and Writing/Speaking review when publishing.</p>
 </div>;
}
