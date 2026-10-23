import Link from "next/link";
import { PageIntro, PageWrap } from "@/components/page-parts";
import { EmptyCatalog } from "@/components/catalog-controls";
export const metadata = { title: "The Ebook Shelf" };
export default function Page() {
  return (
    <PageWrap tone="resources-page">
      <PageIntro
        eyebrow="THE EBOOK SHELF"
        title="Good pages. Within reach."
        description="প্রস্তুতির কাজে লাগে এমন বই আর workbook—একটি গোছানো collection-এ।"
      >
        <Link href="/resources" className="text-link">
          All resources ↗
        </Link>
      </PageIntro>
      <div className="collection-intro">
        <span className="collection-type">EBOOKS / LUMA</span>
        <h2>Keep learning, one page at a time.</h2>
      </div>
      <EmptyCatalog kind="ebooks" />
    </PageWrap>
  );
}
