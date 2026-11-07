import {SaveResourceButton} from "@/components/learner-preferences";
import Link from "next/link";
import {notFound} from "next/navigation";
import {PageWrap,PageIntro} from "@/components/page-parts";
import {db} from "@/lib/auth/db";
import {readSession} from "@/lib/auth/session";
import {premiumResourceLimit} from "@/lib/learner/member-access";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^\d{1,16}$/.test(id))notFound();
 const rows=await db().query("SELECT title,category,body,source_url,access,(SELECT count(*)::int FROM public.learning_resources o WHERE o.category=r.category AND o.status='published' AND o.access='premium' AND (o.created_at,o.id)<=(r.created_at,r.id)) AS rank FROM public.learning_resources r WHERE id=$1 AND status='published'",[id]);
 if(!rows.length)notFound();const r=rows[0];
 if(r.access!=='free'){const userId=(await readSession().catch(()=>null))?.user?.id??null;if(Number(r.rank)>await premiumResourceLimit(userId,String(r.category)))notFound();}
 return <PageWrap tone="resources-page"><PageIntro eyebrow={String(r.category).toUpperCase()} title={String(r.title)}><Link className="text-link" href="/resources">← All resources</Link></PageIntro><article className="workspace-panel"><SaveResourceButton path={"/resources/library/"+id}/><div style={{whiteSpace:"pre-wrap",lineHeight:1.8}}>{r.body}</div>{r.source_url&&<p><a href={r.source_url} target="_blank" rel="noopener noreferrer">Open source document ↗</a></p>}</article></PageWrap>;
}
