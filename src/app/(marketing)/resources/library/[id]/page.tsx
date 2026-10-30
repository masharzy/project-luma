import Link from "next/link";
import {notFound} from "next/navigation";
import {PageWrap,PageIntro} from "@/components/page-parts";
import {db} from "@/lib/auth/db";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^\d{1,16}$/.test(id))notFound();
 const rows=await db().query("SELECT title,category,body,source_url FROM public.learning_resources WHERE id=$1 AND status='published' AND access='free'",[id]);
 if(!rows.length)notFound();const r=rows[0];
 return <PageWrap tone="resources-page"><PageIntro eyebrow={String(r.category).toUpperCase()} title={String(r.title)}><Link className="text-link" href="/resources">← All resources</Link></PageIntro><article className="workspace-panel"><div style={{whiteSpace:"pre-wrap",lineHeight:1.8}}>{r.body}</div>{r.source_url&&<p><a href={r.source_url} target="_blank" rel="noopener noreferrer">Open source document ↗</a></p>}</article></PageWrap>;
}
