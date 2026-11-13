import Link from "next/link";
import { PageWrap, PageIntro, FeatureNote } from "@/components/page-parts";
export const metadata = { title: "Start free" };
export default function Page() {
  return (
    <PageWrap>
      <PageIntro
        eyebrow="START FREE"
        title="Free practice and resources"
        description="Start with free practice and learning resources. You can explore without an account."
      />
      <div className="free-feature-grid">
        {[
          [
            "01",
            "Cambridge 1–21",
            "Listening and Reading practice from the books you know.",
            "/cambridge",
          ],
          [
            "02",
            "Recent Tests",
            "Choose from three modules and practise at your own pace.",
            "/recent-tests",
          ],
          [
            "03",
            "Learning resources",
            "Selected Writing samples, ebooks and study material.",
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
        Guest attempts are not saved to your account history.
      </FeatureNote>
      <div className="inline-signup">
        <div>
          <h2>Save your progress</h2>
          <p>Create a free account to keep your history and feedback.</p>
        </div>
        <Link className="button" href="/auth/sign-up">
          Create a free account <span>↗</span>
        </Link>
      </div>
    </PageWrap>
  );
}
