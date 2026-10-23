import Link from "next/link";
import { PageIntro, PageWrap } from "@/components/page-parts";
import { EmptyCatalog } from "@/components/catalog-controls";
export const metadata = { title: "Vocabulary Practice" };
export default function Page() {
  return (
    <PageWrap tone="">
      <PageIntro
        eyebrow="VOCABULARY PRACTICE"
        title="A better word makes a difference."
        description="শুধু নতুন শব্দ নয়, কোন জায়গায় কোন শব্দ ঠিক হয়—সেই ব্যবহারটাও শেখো।"
      >
        <Link href="/resources" className="text-link">
          All resources ↗
        </Link>
      </PageIntro>
      <div className="collection-intro">
        <span className="collection-type">VOCABULARY / LUMA</span>
        <h2>Learn it. Use it. Make it yours.</h2>
      </div>
      <EmptyCatalog kind="vocabulary" />
    </PageWrap>
  );
}
