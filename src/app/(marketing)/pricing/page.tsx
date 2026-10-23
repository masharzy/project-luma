import Link from "next/link";
import { PageIntro, PageWrap, FeatureNote } from "@/components/page-parts";
import { Icon } from "@/components/ui/icon";
export const metadata = { title: "Free & Premium" };
export default function Page() {
  return (
    <PageWrap tone="pricing-page">
      <PageIntro
        eyebrow="FREE & PREMIUM"
        title="Start small. Make more room."
        description="প্রস্তুতি শুরু করো ফ্রিতে। আরও practice প্রয়োজন হলে থাকবে Premium-এর বাড়তি collection।"
      />
      <div className="pricing-grid">
        {[false, true].map((premium) => (
          <article
            className={"pricing-sheet " + (premium ? "premium-sheet" : "")}
            key={String(premium)}
          >
            <span className="eyebrow">
              {premium ? "MORE ROOM TO GROW" : "A GOOD PLACE TO BEGIN"}
            </span>
            <h2>{premium ? "Premium" : "Free"}</h2>
            <div className="price-display">
              {premium ? "Coming soon" : "৳0"}
              <span>
                {premium ? "Pricing to be announced" : "No subscription needed"}
              </span>
            </div>
            <p lang="bn">
              {premium
                ? "আরও বই, আরও test, আরও শেখার সুযোগ।"
                : "প্রস্তুতির প্রথম ধাপটা হোক সহজ।"}
            </p>
            <ul>
              {(premium
                ? [
                    "Cambridge 11–21",
                    "Expanded practice library",
                    "Premium Writing resources",
                    "Full Vocabulary & Grammar collections",
                  ]
                : [
                    "Cambridge 1–10",
                    "Selected practice tests",
                    "Selected samples & ebooks",
                    "Guest access to free practice",
                  ]
              ).map((line) => (
                <li key={line}>
                  <Icon name="check" size={16} />
                  {line}
                </li>
              ))}
            </ul>
            {premium ? (
              <>
                <button className="button" disabled>
                  Membership opens later <span>↗</span>
                </button>
                <small>No payment is being collected.</small>
              </>
            ) : (
              <Link className="button outline" href="/free">
                Explore free practice <span>↗</span>
              </Link>
            )}
          </article>
        ))}
      </div>
      <FeatureNote>
        Premium price, payment provider ও usage limits এখনো নির্ধারিত হয়নি। কোনো
        purchase বা subscription এখন চালু নেই।
      </FeatureNote>
    </PageWrap>
  );
}
