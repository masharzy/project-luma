import Link from "next/link";
import { PageIntro, PageWrap } from "@/components/page-parts";
import { EmptyCatalog } from "@/components/catalog-controls";
export const metadata = { title: "The Luma Journal" };
export default function Page() {
  return (
    <PageWrap tone="resources-page">
      <PageIntro
        eyebrow="THE LUMA JOURNAL"
        title="A little reading for the road."
        description="IELTS প্রস্তুতি, শেখার অভ্যাস আর সামনে এগোনোর ভাবনা—একটু সময় নিয়ে পড়ো।"
      >
        <Link href="/resources" className="text-link">
          All resources ↗
        </Link>
      </PageIntro>
      <div className="collection-intro">
        <span className="collection-type">BLOG / LUMA</span>
        <h2>Keep learning, one page at a time.</h2>
      </div>
      <EmptyCatalog kind="blog" />
    </PageWrap>
  );
}
