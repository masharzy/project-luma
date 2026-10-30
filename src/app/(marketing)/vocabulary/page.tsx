import Link from "next/link";
import {PageIntro,PageWrap} from "@/components/page-parts";
import {db} from "@/lib/auth/db";
export const metadata={title:"IELTS Vocabulary Practice"};
export const dynamic="force-dynamic";
export default async function Page(){
 const rows=await db().query("SELECT id,title,description FROM public.admin_content WHERE kind='vocabulary' AND status='published' AND access='free' ORDER BY created_at DESC LIMIT 200");
 return <PageWrap tone="resources-page"><PageIntro eyebrow="VOCABULARY PRACTICE" title="A better word makes a difference." description="শুধু নতুন শব্দ নয়, কোন জায়গায় কোন শব্দ ঠিক হয়—সেই ব্যবহারটাও শেখো।"><Link href="/resources" className="text-link">All resources ↗</Link></PageIntro>
  <section className="workspace-panel"><h2>Vocabulary collection</h2>{!rows.length&&<p>No published free vocabulary yet. Entries published in the Admin vocabulary panel appear here automatically.</p>}
   <div className="admin-item-grid">{rows.map(v=><article key={String(v.id)} className="workspace-panel admin-item-card"><h3>{v.title}</h3><p style={{whiteSpace:"pre-wrap"}}>{v.description||"Meaning and examples coming soon."}</p></article>)}</div>
  </section></PageWrap>;
}
