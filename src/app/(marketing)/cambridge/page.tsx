import { PageIntro, PageWrap } from "@/components/page-parts";
import { CambridgeCatalog } from "@/components/catalog-controls";
import { listCambridgeBooks, listCambridgeTests } from "@/lib/cambridge";
export const metadata = { title: "Cambridge library" };
export const dynamic = "force-dynamic";
export default async function Page() {
    const tests = await listCambridgeTests();
    const books = await listCambridgeBooks();
    const bookCount = books.length;
    return <PageWrap tone="library-page">
  <PageIntro eyebrow="CAMBRIDGE LIBRARY" title="Familiar books. A fresh start." description="তোমার বই বেছে নাও। পুরো test দাও, অথবা একটি module দিয়ে শুরু করো।"/>
  <div className="library-banner"><span>THE CAMBRIDGE SHELF</span>
   <p>{bookCount} books. <em>Your own pace.</em></p>
   <span>LISTENING / READING / WRITING</span></div>
  <CambridgeCatalog tests={tests} books={books}/>
 </PageWrap>;
}
