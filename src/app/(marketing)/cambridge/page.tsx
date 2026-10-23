import { PageIntro, PageWrap } from "@/components/page-parts";
import { CambridgeCatalog } from "@/components/catalog-controls";
export const metadata = { title: "Cambridge library" };
export default function Page() {
  return (
    <PageWrap tone="library-page">
      <PageIntro
        eyebrow="CAMBRIDGE LIBRARY"
        title="Familiar books. A fresh start."
        description="চেনা বইয়ের প্রস্তুতি, গোছানো এক library-তে। Cambridge ১–১০ ফ্রি; ১১–২১ Premium।"
      />
      <div className="library-banner">
        <span>THE CAMBRIDGE SHELF</span>
        <p>
          21 books. <em>Your own pace.</em>
        </p>
        <span>LISTENING / READING</span>
      </div>
      <CambridgeCatalog />
    </PageWrap>
  );
}
