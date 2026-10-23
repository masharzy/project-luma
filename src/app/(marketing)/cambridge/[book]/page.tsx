import { notFound } from "next/navigation";
import Link from "next/link";
import { PageIntro, PageWrap } from "@/components/page-parts";
import { Icon } from "@/components/ui/icon";
import { db } from "@/lib/auth/db";
import { listCambridgeTests } from "@/lib/cambridge";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{book:string}>}) {
 const {book}=await params;
 const number=Number(book);
 if(!/^\d+$/.test(book)||!Number.isSafeInteger(number)||number<1) notFound();
 const tests=(await listCambridgeTests()).filter(t=>t.bookNumber===number);
 if(!tests.length) notFound();
 const savedRows=await db().query("SELECT parent_id,module FROM public.exam_modules WHERE kind='cambridge' AND parent_id=ANY($1::bigint[]) AND jsonb_array_length(document->'parts')>0 AND (module='writing' OR jsonb_array_length(document->'questions')>0)",[tests.map(t=>t.id)]);
 const available=new Set(savedRows.map(r=>String(r.parent_id)+":"+String(r.module)));
 const premium=tests.every(t=>t.access==="premium");
 const allModules=Array.from(new Set(tests.flatMap(t=>t.sections)));
 return <PageWrap tone="library-page">
  <PageIntro eyebrow={"CAMBRIDGE / "+number} title={"Cambridge "+number}
   description="এই বইয়ের published tests সিরিয়াল অনুযায়ী সাজানো। প্রতিটি test-এর available module ও access Admin Panel থেকে নির্ধারিত।">
   <Link className="text-link" href="/cambridge">← Back to the shelf</Link>
  </PageIntro>
  <div className="book-detail"><div className={"book-cover "+(premium?"premium-detail":"")}>
   <span>CAMBRIDGE<br/>IELTS</span><strong>{String(number).padStart(2,"0")}</strong>
   <span>YOUR PRACTICE COLLECTION</span></div>
   <section><span className="access-pill">{premium?"PREMIUM LIBRARY":"CAMBRIDGE LIBRARY"}</span>
    <h2>Take it one test at a time.</h2><p lang="bn">{tests.length}টি published test পাওয়া যাচ্ছে।</p>
    <div className="book-modules">{allModules.map(section=><span key={section}>
     <Icon name={section==="listening"?"headphones":"book"}/>{section[0].toUpperCase()+section.slice(1)}
    </span>)}</div>
   </section>
  </div>
  <div className="book-grid">
   {tests.map(test=><div className={`catalog-book ${test.access==="premium"?"premium-book":""}`} key={test.id}>
    <div className="book-cover"><span>CAMBRIDGE<br/>IELTS</span>
     <strong>{String(test.testNumber).padStart(2,"0")}</strong>
     <span>{test.sections.map(s=>s.toUpperCase()).join(" / ")}</span><span className="book-spine"/></div>
    <div className="book-caption"><div><h2>{test.title||"Test "+test.testNumber}</h2>
     <span>{test.access==="premium"?"Premium access":"Free access"} · {test.sections.length} modules</span>
    </div>{test.access==="premium"?<Icon name="lock" size={17}/>:<span>↗</span>}</div>
    <div className="book-modules">{test.sections.map(s=>test.access==="free"&&available.has(test.id+":"+s)?<Link className="text-link" key={s} href={`/exam/cambridge/${test.id}/${s}`}>{s[0].toUpperCase()+s.slice(1)} ↗</Link>:<span key={s}>{s[0].toUpperCase()+s.slice(1)}{test.access==="premium"?" · Premium":" · Not added yet"}</span>)}</div>

   </div>)}
  </div>
 </PageWrap>;
}
