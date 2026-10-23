import Link from "next/link";
import { PageIntro, PageWrap } from "@/components/page-parts";
import { resourceCategories } from "@/config/features";
export const metadata = { title: "Learning resources" };
export default function Page() {
  return (
    <PageWrap tone="resources-page">
      <PageIntro
        eyebrow="THE LEARNING SHELF"
        title="More ways to move forward."
        description="শুধু test দিয়েই শেষ নয়। Writing, শব্দ, grammar আর প্রয়োজনের বই—শেখার জায়গাটাও থাকুক হাতের কাছে।"
      />
      <div className="resource-category-grid">
        {resourceCategories.map((r) => (
          <Link
            href={r.href}
            key={r.href}
            className={"resource-category resource-" + r.number}
          >
            <span className="eyebrow">{r.label}</span>
            <div className="resource-art" aria-hidden="true">
              {r.number === "01" ? (
                <>
                  an idea,<em>well written.</em>
                </>
              ) : r.number === "02" ? (
                <>
                  good<em>precise.</em>
                </>
              ) : r.number === "03" ? (
                <>
                  a little<em>structure.</em>
                </>
              ) : (
                <>
                  one more<em>chapter.</em>
                </>
              )}
            </div>
            <h2>{r.title}</h2>
            <p lang="bn">{r.description}</p>
            <span className="resource-bottom">
              Explore collection <b>↗</b>
            </span>
          </Link>
        ))}
      </div>
      <Link href="/blog" className="journal-banner">
        <span className="eyebrow">THE LUMA JOURNAL</span>
        <h2>A little reading for the road.</h2>
        <span>Open the journal ↗</span>
      </Link>
    </PageWrap>
  );
}
