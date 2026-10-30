import {publicPageMetadata} from "@/lib/seo";
import {PageIntro,PageWrap} from "@/components/page-parts";
import {OtherBooksCatalog} from "@/components/other-books-catalog";
import {listCatalogSeries} from "@/lib/other-books-registry";
export const metadata=publicPageMetadata("IELTS Practice Books | More Books","Collins, Barron’s ও অন্যান্য IELTS বইয়ের collection থেকে test বেছে অনুশীলন করো।", "/other-books");
export const dynamic="force-dynamic";
export default async function Page(){
 const series=await listCatalogSeries();
 return <PageWrap tone="library-page"><PageIntro eyebrow="MORE BOOKS" title="More Books"/>
  <OtherBooksCatalog entries={series.map(s=>({key:s.slug,title:s.name,cover:s.cover,href:"/other-books/"+s.slug}))}/>{!series.length&&<p>Book collections are being prepared.</p>}
 </PageWrap>;
}
