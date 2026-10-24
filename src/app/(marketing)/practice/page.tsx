import Link from "next/link";
import { PageIntro, PageWrap, FeatureNote } from "@/components/page-parts";
import { modules } from "@/config/features";
import { Icon } from "@/components/ui/icon";
import { PracticeCatalog } from "@/components/practice-catalog";
export const metadata = { title: "Practice tests" };
export default function Page() {
  return (
    <PageWrap>
      <PageIntro
        eyebrow="PRACTICE"
        title="A little practice. A little closer."
        description="সময় যখন তোমার, practice-ও তোমার মতো। Listening অথবা Reading—বেছে নাও নিজের জায়গাটা।"
      />
      <div className="module-cards">
        {modules.filter(m=>m.id!=='writing').map((m) => (
          <Link
            href={"/practice/" + m.id}
            key={m.id}
            className={"module-card " + m.id}
          >
            <div className="module-card-top">
              <span>{m.number} /</span>
              <Icon name={m.icon} size={26} />
            </div>
            <h2>{m.name}</h2>
            <h3>{m.line}</h3>
            <p lang="bn">{m.description}</p>
            <span className="module-card-bottom">
              Explore {m.name}
              <span>↗</span>
            </span>
          </Link>
        ))}
      </div>
      <div className="section-heading-inline">
        <h2>Find your next test.</h2>
        <Link href="/cambridge">Cambridge library ↗</Link>
      </div>
      <PracticeCatalog />
      <FeatureNote>
        Guest হিসেবেও free practice করা যাবে। Account ছাড়া দেওয়া test-এর history
        save হবে না। Test content এখনো publish করা হয়নি।
      </FeatureNote>
    </PageWrap>
  );
}
