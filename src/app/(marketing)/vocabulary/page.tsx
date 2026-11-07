import Link from "next/link";
import {PageIntro,PageWrap} from "@/components/page-parts";
import {readSession} from "@/lib/auth/session";
import {FREE_LIMIT,TOPICS,USES,listVocabulary,parseFilters} from "@/lib/vocabulary";
import {WordCard} from "@/components/vocabulary/word-card";
import styles from "@/components/vocabulary/vocabulary.module.css";
export const metadata={title:"IELTS Vocabulary Practice",description:"IELTS vocabulary by topic and band, with Bangla meanings, Writing and Speaking examples, collocations and practice."};
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const f=parseFilters(await searchParams);
 const userId=(await readSession().catch(()=>null))?.user?.id??null;
 const {cards,total,open,pages}=await listVocabulary(userId,f);
 const qs=(page:number)=>{const p=new URLSearchParams();if(f.topic)p.set("topic",f.topic);if(f.band)p.set("band",String(f.band));if(f.use)p.set("use",f.use);if(f.q)p.set("q",f.q);if(page>1)p.set("page",String(page));const s=p.toString();return s?`?${s}`:"";};
 const page=f.page??1;
 const practice=(()=>{const p=new URLSearchParams();if(f.topic)p.set("topic",f.topic);if(f.band)p.set("band",String(f.band));if(f.use)p.set("use",f.use);const s=p.toString();return `/vocabulary/practice${s?`?${s}`:""}`;})();
 return <PageWrap tone="resources-page"><PageIntro eyebrow="VOCABULARY PRACTICE" title="A better word makes a difference." description="শুধু নতুন শব্দ নয়, কোন জায়গায় কোন শব্দ ঠিক হয়—সেই ব্যবহারটাও শেখো।"><Link href="/resources" className="text-link">All resources ↗</Link></PageIntro>
  <section className="workspace-panel">
   <p>The first {FREE_LIMIT} words are free for everyone.{open<=FREE_LIMIT&&<> More words open with a <Link href="/pricing" className="text-link">plan</Link>.</>}</p>
   <form method="get" className={styles.filters}>
    <select name="topic" defaultValue={f.topic??""} aria-label="Topic"><option value="">All topics</option>{TOPICS.map(t=><option key={t} value={t}>{t}</option>)}</select>
    <select name="band" defaultValue={f.band??""} aria-label="Band"><option value="">All bands</option><option value="6">Band 6</option><option value="7">Band 7</option><option value="8">Band 8+</option></select>
    <select name="use" defaultValue={f.use??""} aria-label="Use"><option value="">Writing and Speaking</option>{USES.map(u=><option key={u} value={u}>{u}</option>)}</select>
    <input name="q" defaultValue={f.q??""} placeholder="Starts with…" aria-label="Search word"/>
    <button type="submit">Filter</button>
    <Link href={practice} className="text-link">Practice these ↗</Link>
   </form>
   <p>{total} words</p>
   {!cards.length&&<p>No words match this filter.</p>}
   <div className={styles.grid}>{cards.map(c=>c.detail?<WordCard key={c.id} w={c.detail}/>:<article key={c.id} className={`${styles.card} ${styles.locked}`}><h3 className={styles.word}>{c.word}</h3><span className={styles.pos}>{c.pos.join(" / ")} · Band {c.band}{c.band===8?"+":""}</span><p className={styles.lock}>Part of a paid plan. <Link href="/pricing" className="text-link">See plans</Link></p></article>)}</div>
   {pages>1&&<nav className={styles.pager} aria-label="Pages">{page>1&&<Link href={qs(page-1)||"?"} className="text-link">← Previous</Link>}<span>Page {page} of {pages}</span>{page<pages&&<Link href={qs(page+1)} className="text-link">Next →</Link>}</nav>}
  </section></PageWrap>;
}
