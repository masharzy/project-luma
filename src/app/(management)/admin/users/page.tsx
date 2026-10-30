import Link from "next/link";
import { WorkspaceHeading,EmptyState } from "@/components/page-parts";
import { requireAdmin } from "@/lib/auth/guards";
import { AdminUserActions } from "@/components/admin-user-actions";
import { directoryInput,getUserDirectory,userFilters } from "@/lib/admin/users";
export const dynamic="force-dynamic";
const labels={all:"All users",verified:"Verified",unverified:"Unverified",admins:"Admins",blocked:"Blocked"};
export default async function Page({searchParams}:{searchParams:Promise<{q?:string;status?:string;page?:string}>}){
 const admin=await requireAdmin();const input=directoryInput(await searchParams);
 let directory;try{directory=await getUserDirectory(input);}catch{return <section className="workspace-panel"><EmptyState title="User directory unavailable" description="Please try again shortly."/></section>;}
 const href=(page:number)=>"/admin/users?"+new URLSearchParams({q:input.q,status:input.status,page:String(page)});
 return <div className="admin-refactor"><WorkspaceHeading eyebrow="PEOPLE & ACCESS" title="Your learners" description="Search accounts, inspect verification status and review access at a glance."/>
 <div className="admin-kpi-grid admin-user-kpis"><div className="admin-kpi"><span>Matching accounts</span><strong>{directory.total}</strong></div><div className="admin-kpi"><span>Current page</span><strong>{directory.page} / {directory.pages}</strong></div></div>
 <section className="workspace-panel admin-users-panel"><form action="/admin/users" method="get" className="admin-user-filters"><input type="search" name="q" defaultValue={input.q} maxLength={100} placeholder="Search by name or email"/><select name="status" defaultValue={input.status}>{userFilters.map(s=><option value={s} key={s}>{labels[s]}</option>)}</select><button className="button" type="submit">Search ↗</button><Link href="/admin/users">Reset</Link></form>
 <div className="table-scroll"><table className="admin-users-table"><thead><tr><th>LEARNER</th><th>ROLE</th><th>VERIFICATION</th><th>ACCESS</th><th>METHOD</th><th>JOINED</th><th>ACTIONS</th></tr></thead><tbody>{directory.users.map(u=><tr key={u.id}><td><div className="admin-user-person"><span className="admin-user-avatar">{u.name.slice(0,1).toUpperCase()}</span><div><strong>{u.name}</strong><small>{u.email}</small></div></div></td><td>{u.role}</td><td><span className={u.email_verified?"admin-state good":"admin-state pending"}>{u.email_verified?"Verified":"Pending"}</span></td><td><span className={u.banned?"admin-state pending":"admin-state good"}>{u.banned?"Blocked":"Active"}</span></td><td>{[u.has_google&&"Google",u.has_password&&"Password"].filter(Boolean).join(" + ")||"None"}</td><td>{new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeZone:"Asia/Dhaka"}).format(new Date(u.created_at))}</td><td><AdminUserActions id={u.id} role={u.role} banned={u.banned} isSelf={u.id===admin.id}/></td></tr>)}
 {!directory.users.length&&<tr><td colSpan={7}>No matching accounts.</td></tr>}</tbody></table></div>
 <div className="admin-pagination"><span>{directory.total?(directory.page-1)*directory.pageSize+1:0}–{Math.min(directory.page*directory.pageSize,directory.total)} of {directory.total}</span><div>{directory.page>1&&<Link href={href(directory.page-1)}>← Previous</Link>}{directory.page<directory.pages&&<Link href={href(directory.page+1)}>Next →</Link>}</div></div></section></div>;
}
