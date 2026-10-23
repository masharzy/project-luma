import Link from "next/link";
import { PageIntro, PageWrap } from "@/components/page-parts";
import { EmptyCatalog } from "@/components/catalog-controls";
export const metadata = { title: "Grammar Practice" };
export default function Page() {
  return (
    <PageWrap tone="">
      <PageIntro
        eyebrow="GRAMMAR PRACTICE"
        title="Let your sentences do the talking."
        description="Grammar-এর ছোট ছোট ভুল বুঝে পরিষ্কার, সহজ আর সাবলীল বাক্য গড়ার প্রস্তুতি।"
      >
        <Link href="/resources" className="text-link">
          All resources ↗
        </Link>
      </PageIntro>
      <div className="collection-intro">
        <span className="collection-type">GRAMMAR / LUMA</span>
        <h2>Learn it. Use it. Make it yours.</h2>
      </div>
      <EmptyCatalog kind="grammar" />
    </PageWrap>
  );
}
