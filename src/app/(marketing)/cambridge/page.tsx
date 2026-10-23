import { PageIntro, PageWrap } from "@/components/page-parts";
import { CambridgeCatalog } from "@/components/catalog-controls";
import { listCambridgeTests } from "@/lib/cambridge";
export const metadata = { title: "Cambridge library" };
export const dynamic = "force-dynamic";
export default async function Page() {
 const tests=await listCambridgeTests();
 const bookCount=new Set(tests.map(t=>t.bookNumber)).size;
 return <PageWrap tone="library-page">
  <PageIntro eyebrow="CAMBRIDGE LIBRARY" title="Familiar books. A fresh start."
   description="Admin-এর publish করা Cambridge tests এখানেই দেখাবে। Free ও Premium access প্রতিটি test অনুযায়ী নির্ধারিত।"/>
  <div className="library-banner"><span>THE CAMBRIDGE SHELF</span>
   <p>{bookCount} books. <em>Your own pace.</em></p>
   <span>LISTENING / READING / WRITING</span></div>
  <CambridgeCatalog tests={tests}/>
 </PageWrap>;
}
