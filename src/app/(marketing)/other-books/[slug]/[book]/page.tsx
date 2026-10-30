import Link from "next/link";
import {notFound} from "next/navigation";
import {PracticeTestCards} from "@/components/practice-test-cards";
import {PageIntro,PageWrap} from "@/components/page-parts";
import {CambridgeQuestionPractice} from "@/components/cambridge-question-practice";
import {listCatalogVolumes} from "@/lib/other-books-registry";
import {listOtherBookTests} from "@/lib/other-books-catalog";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string;book:string}>}){const {slug,book}=await params;const b=(await listCatalogVolumes()).find(v=>v.slug===book&&v.seriesSlug===slug);return {title:b?b.series+" · "+b.volume:"More Books"};}
export default async function Page({params}:{params:Promise<{slug:string;book:string}>}){
 const {slug,book}=await params,current=(await listCatalogVolumes()).find(v=>v.slug===book&&v.seriesSlug===slug);
 if(!current)notFound();
 const tests=await listOtherBookTests(book);
 return <PageWrap tone="library-page"><PageIntro eyebrow={current.series.toUpperCase()} title={current.series+" · "+current.volume}><Link className="text-link" href={"/other-books/"+slug}>← All {current.series} books</Link></PageIntro>
  <CambridgeQuestionPractice collection="other-books" book={book}/>
  <PracticeTestCards tests={tests.map(test=>({...test,modules:test.modules.map(m=>m.module)}))}/>
  {!tests.length&&<div className="workspace-panel admin-empty">Tests are being prepared for this book.</div>}
 </PageWrap>;
}
