import Link from "next/link";
import { PageWrap, PageIntro, FeatureNote } from "@/components/page-parts";
export const metadata = { title: "Start free" };
export default function Page() {
  return (
    <PageWrap>
      <PageIntro
        eyebrow="START FREE"
        title="Begin with what you have."
        description="ফ্রি practice আর learning resources দিয়েই শুরু হোক প্রস্তুতি। Account ছাড়াও explore করতে পারবে।"
      />
      <div className="free-feature-grid">
        {[
          [
            "01",
            "Cambridge 1–10",
            "চেনা বইয়ের Listening আর Reading practice।",
            "/cambridge",
          ],
          [
            "02",
            "Practice tests",
            "নিজের সময় অনুযায়ী তিনটি module থেকে বেছে নাও।",
            "/practice",
          ],
          [
            "03",
            "Learning resources",
            "নির্বাচিত Writing samples, ebook আর শেখার উপকরণ।",
            "/resources",
          ],
        ].map(([n, title, desc, href]) => (
          <Link className="free-feature" href={href} key={n}>
            <span className="eyebrow">{n} / EXPLORE</span>
            <h2>{title}</h2>
            <p lang="bn">{desc}</p>
            <span>Take a look ↗</span>
          </Link>
        ))}
      </div>
      <FeatureNote>
        Guest attempt account history-তে save হবে না। Library-তে content publish
        হলে free practice শুরু করতে পারবে।
      </FeatureNote>
      <div className="inline-signup">
        <div>
          <h2>A place to keep your progress.</h2>
          <p lang="bn">প্রস্তুতির নিজের জায়গাটা তৈরি করে রাখতে পারো আজই।</p>
        </div>
        <Link className="button" href="/auth/sign-up">
          Create a free account <span>↗</span>
        </Link>
      </div>
    </PageWrap>
  );
}
