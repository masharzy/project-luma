import Link from "next/link";
import {WorkspaceHeading} from "@/components/page-parts";
import {db} from "@/lib/auth/db";
export const dynamic="force-dynamic";
export const metadata={title:"Administrative activity log"};
export default async function Page({searchParams}:{searchParams:Promise<{q?:string,page?:string}>}){
 const input=await searchParams;
 const q=typeof input.q==='string'?input.q.trim().slice(0,100):"";
 const requested=Number(input.page);
 const page=Number.isInteger(requested)&&requested>0?Math.min(requested,10000):1;
 const [count,rows]=await Promise.all([
  db().query("SELECT count(*)::int total FROM app_auth.audit_events WHERE ($1='' OR strpos(lower(action),lower($1))>0)",[q]),
  db().query(`SELECT a.id,a.action,a.created_at,u.email
    FROM app_auth.audit_events a LEFT JOIN app_auth.users u ON u.id=a.user_id
    WHERE ($1='' OR strpos(lower(a.action),lower($1))>0)
    ORDER BY a.created_at DESC,a.id DESC LIMIT 50 OFFSET $2::int`,[q,(page-1)*50])
 ]);
 const total=Number(count[0]?.total||0);
 const url=(p:number)=>"/admin/activity?"+new URLSearchParams({q,page:String(p)});
 return <div className="admin-refactor"><WorkspaceHeading eyebrow="SECURITY / HISTORY" title="Administrative activity" description="Read-only audit events: content changes, access grants, subscriptions and mock actions."/>
  <section className="workspace-panel"><form method="get" action="/admin/activity" className="admin-user-filters"><input name="q" type="search" maxLength={100} defaultValue={q} placeholder="Filter actions…" aria-label="Filter audit actions"/><button className="button">Search ↗</button><Link href="/admin/activity">Reset</Link></form>
  <div className="table-scroll"><table className="admin-users-table"><thead><tr><th>TIME (BD)</th><th>ACTOR</th><th>ACTION</th></tr></thead><tbody>{rows.map(r=><tr key={String(r.id)}><td>{new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Dhaka"}).format(new Date(r.created_at))}</td><td>{r.email||"System / deleted user"}</td><td>{r.action}</td></tr>)}{!rows.length&&<tr><td colSpan={3}>No audit events found.</td></tr>}</tbody></table></div>
  <div className="admin-pagination"><span>{total} events · page {page}</span><div>{page>1&&<Link href={url(page-1)}>← Previous</Link>}{page*50<total&&<Link href={url(page+1)}>Next →</Link>}</div></div></section>
 </div>;
}
