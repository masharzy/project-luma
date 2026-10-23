import Link from "next/link";
import { PageIntro, PageWrap } from "@/components/page-parts";
import { EmptyCatalog } from "@/components/catalog-controls";
export const metadata = { title: "Writing / Samples & Guides" };
export default function Page() {
  return (
    <PageWrap tone="resources-page">
      <PageIntro
        eyebrow="WRITING / SAMPLES & GUIDES"
        title="An idea, well written."
        description="Sample answer-এর structure, ভাবনার ক্রম আর শব্দের ব্যবহার দেখে নিজের Writing আরও গোছাও।"
      >
        <Link href="/resources" className="text-link">
          All resources ↗
        </Link>
      </PageIntro>
      <div className="collection-intro">
        <span className="collection-type">WRITING / LUMA</span>
        <h2>Keep learning, one page at a time.</h2>
      </div>
      <EmptyCatalog kind="writing" />
    </PageWrap>
  );
}
