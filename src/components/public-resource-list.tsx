import Link from "next/link";
import {db} from "@/lib/auth/db";
export async function PublicResourceList({category}:{category:"writing"|"ebook"|"journal"|"grammar"}){
 const rows=await db().query("SELECT id::text,title,body,source_url,created_at FROM public.learning_resources WHERE category=$1 AND status='published' AND access='free' ORDER BY created_at DESC LIMIT 100",[category]);
 return <section className="workspace-panel"><h2>{rows.length?"Published learning materials":"Resources coming soon"}</h2>{!rows.length&&<p>No published free resources in this collection yet. New materials will appear here when the administrator publishes them.</p>}
  <div className="admin-item-grid">{rows.map(r=><article key={r.id} className="workspace-panel admin-item-card"><h3><Link href={"/resources/library/"+r.id}>{r.title} ↗</Link></h3><p style={{whiteSpace:"pre-wrap"}}>{String(r.body||"").slice(0,450)}{String(r.body||"").length>450?"…":""}</p><Link href={"/resources/library/"+r.id}>Read resource ↗</Link></article>)}</div>
 </section>;
}
