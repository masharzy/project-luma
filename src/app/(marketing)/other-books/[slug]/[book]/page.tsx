import Link from "next/link";
import {notFound} from "next/navigation";
import {PracticeTestCards} from "@/components/practice-test-cards";
import {PageIntro,PageWrap} from "@/components/page-parts";
import {CambridgeQuestionPractice} from "@/components/cambridge-question-practice";
import {listCatalogVolumes} from "@/lib/other-books-registry";
import {listOtherBookTests} from "@/lib/other-books-catalog";
import {readSession} from "@/lib/auth/session";
import {canOpenTest} from "@/lib/learner/test-access";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string;book:string}>}){const {slug,book}=await params;const b=(await listCatalogVolumes()).find(v=>v.slug===book&&v.seriesSlug===slug);return {title:b?b.series+" · "+b.volume:"More Books"};}
export default async function Page({params}:{params:Promise<{slug:string;book:string}>}){
 const {slug,book}=await params,current=(await listCatalogVolumes()).find(v=>v.slug===book&&v.seriesSlug===slug);
 if(!current)notFound();
 const listed=await listOtherBookTests(book);
 // Premium tests stay listed and open for a member whose plan or grants cover them.
 const userId=(await readSession().catch(()=>null))?.user?.id??null;
 const tests=await Promise.all(listed.map(async t=>t.access==='premium'&&(await canOpenTest('premium',userId,{kind:'practice',id:t.id}).catch(()=>false))?{...t,access:'free' as const}:t));
 return <PageWrap tone="library-page"><PageIntro eyebrow={current.series} title={current.series+" · "+current.volume} crumbs={[{label:"More Books",href:"/other-books"},{label:current.series,href:"/other-books/"+slug},{label:current.volume}]}/>
  <CambridgeQuestionPractice collection="other-books" book={book}/>
  <PracticeTestCards tests={tests.map(test=>({...test,modules:test.modules.map(m=>m.module)}))}/>
  {!tests.length&&<div className="workspace-panel admin-empty">Tests are being prepared for this book.</div>}
 </PageWrap>;
}
