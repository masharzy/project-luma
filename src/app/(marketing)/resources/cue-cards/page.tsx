import Link from "next/link";
import { PageIntro, PageWrap } from "@/components/page-parts";

export const metadata = { title: "Speaking Cue Cards" };

export default function Page() {
  return (
    <PageWrap tone="resources-hub-page">
      <PageIntro
        eyebrow="RESOURCES / SPEAKING"
        title="Speaking Cue Cards"
        description="Part 2 practice: এক মিনিটে প্রস্তুতি নাও, তারপর দুই মিনিট ধরে উত্তর বলার চেষ্টা করো।"
      >
        <Link href="/resources" className="text-link">All resources ↗</Link>
      </PageIntro>
      <article className="resources-cue">
        <span className="eyebrow">PRACTICE TOPIC / 01</span>
        <h2>Describe a place you enjoy visiting.</h2>
        <p>Say where it is, what you do there, who you go with, and explain why you enjoy it.</p>
        <div className="resources-cue-action">
          <span>1 minute to prepare · Up to 2 minutes to speak</span>
          <Link className="button" href="/speaking-evaluation">Open Speaking Practice ↗</Link>
        </div>
      </article>
    </PageWrap>
  );
}
