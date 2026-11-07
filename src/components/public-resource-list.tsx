import Link from "next/link";
import {db} from "@/lib/auth/db";
import {readSession} from "@/lib/auth/session";
import {premiumResourceLimit} from "@/lib/learner/member-access";
export async function PublicResourceList({category}:{category:"writing"|"ebook"|"journal"|"grammar"}){
 const userId=(await readSession().catch(()=>null))?.user?.id??null;
 const extra=await premiumResourceLimit(userId,category);
 // Free items for everyone; premium items too when the member's plan includes this collection (oldest first, up to the plan's number).
 const rows=await db().query("SELECT id::text,title,body,source_url,created_at FROM public.learning_resources WHERE category=$1 AND status='published' AND (access='free' OR (access='premium' AND id IN (SELECT id FROM public.learning_resources WHERE category=$1 AND status='published' AND access='premium' ORDER BY created_at,id LIMIT $2))) ORDER BY created_at DESC LIMIT 100",[category,Number.isFinite(extra)?extra:1000]);
 return <section className="workspace-panel"><h2>{rows.length?"Published learning materials":"Resources coming soon"}</h2>{!rows.length&&<p>No published free resources in this collection yet. New materials will appear here when the administrator publishes them.</p>}
  <div className="admin-item-grid">{rows.map(r=><article key={r.id} className="workspace-panel admin-item-card"><h3><Link href={"/resources/library/"+r.id}>{r.title} ↗</Link></h3><p style={{whiteSpace:"pre-wrap"}}>{String(r.body||"").slice(0,450)}{String(r.body||"").length>450?"…":""}</p><Link href={"/resources/library/"+r.id}>Read resource ↗</Link></article>)}</div>
 </section>;
}
