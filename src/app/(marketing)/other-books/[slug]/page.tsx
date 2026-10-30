import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {PageIntro,PageWrap} from "@/components/page-parts";
import {OtherBooksCatalog} from "@/components/other-books-catalog";
import {CambridgeQuestionPractice} from "@/components/cambridge-question-practice";
import {listCatalogSeries,listCatalogVolumes} from "@/lib/other-books-registry";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const s=(await listCatalogSeries()).find(s=>s.slug===slug);return {title:s?.name||"More Books"};}
export default async function Page({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const [allSeries,allVolumes]=await Promise.all([listCatalogSeries(),listCatalogVolumes()]);
 const series=allSeries.find(s=>s.slug===slug);
 if(!series){const volume=allVolumes.find(v=>v.slug===slug);if(volume)redirect("/other-books/"+volume.seriesSlug+"/"+volume.slug);notFound();}
 const books=allVolumes.filter(v=>v.seriesSlug===slug);
 return <PageWrap tone="library-page"><PageIntro eyebrow="MORE BOOKS" title={series.name}><Link className="text-link" href="/other-books">← All collections</Link></PageIntro>
  <CambridgeQuestionPractice collection="other-books" series={slug}/>
  <OtherBooksCatalog entries={books.map(b=>({key:b.slug,title:b.series+" · "+b.volume,cover:b.cover,href:"/other-books/"+b.seriesSlug+"/"+b.slug}))}/>
  {!books.length&&<p>No published books in this collection yet.</p>}
 </PageWrap>;
}
