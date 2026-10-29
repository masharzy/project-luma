import { publicPageMetadata } from "@/lib/seo";
import { PageIntro, PageWrap } from "@/components/page-parts";
import { CambridgeCatalog } from "@/components/catalog-controls";
import { CambridgeQuestionPractice } from "@/components/cambridge-question-practice";
import "@/styles/cambridge-question-practice.css";
import { listCambridgeBooks, listCambridgeTests } from "@/lib/cambridge";
export const metadata = publicPageMetadata("Cambridge IELTS Practice Tests", "Cambridge IELTS বই বেছে Listening, Reading ও Writing অনুশীলন করো। পুরো test অথবা নির্দিষ্ট question type দিয়ে প্রস্তুতি শুরু করো।", "/cambridge");
export const dynamic = "force-dynamic";
export default async function Page() {
    const tests = await listCambridgeTests();
    const books = await listCambridgeBooks();
    // const bookCount = books.length; // Used by the archived shelf banner below.
    return <PageWrap tone="library-page">
  <PageIntro eyebrow="CAMBRIDGE LIBRARY" title="Familiar books. A fresh start." description="তোমার বই বেছে নাও। পুরো test দাও, অথবা একটি module দিয়ে শুরু করো।"/>
  {/* Shelf banner kept for future reuse; hidden to save vertical space.
  <div className="library-banner"><span>THE CAMBRIDGE SHELF</span>
   <p>{bookCount} books. <em>Your own pace.</em></p>
   <span>LISTENING / READING / WRITING</span></div>
  */}
  <CambridgeQuestionPractice />
  <CambridgeCatalog tests={tests} books={books}/>
 </PageWrap>;
}
