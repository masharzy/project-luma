import { PageIntro, PageWrap, FeatureNote } from "@/components/page-parts";
import { EmptyCatalog } from "@/components/catalog-controls";
export const metadata = { title: "Scheduled mock tests" };
export default function Page() {
  return (
    <PageWrap>
      <PageIntro
        eyebrow="THE MOCK EXPERIENCE"
        title="Make the real day feel familiar."
        description="একই সময়ে শুরু, নির্দিষ্ট সময়ের পরীক্ষা। Listening, Reading ও Writing—একটি পূর্ণ mock experience।"
      />
      <div className="mock-page-banner">
        <div>
          <span className="eyebrow">A DRESS REHEARSAL FOR YOUR NEXT STEP</span>
          <h2>
            One sitting.
            <br />
            <em>Three modules.</em>
          </h2>
          <p lang="bn">আগে register করবে। সময় হলে সবাই মিলে শুরু করবে।</p>
        </div>
        <ol>
          {[
            ["01", "Register", "পছন্দের mock-এর জন্য নাম লেখাও।"],
            [
              "02",
              "Join the waiting room",
              "শুরুর আগে email reminder আর একটু অপেক্ষা।",
            ],
            ["03", "Take your seat", "Listening → Reading → Writing।"],
          ].map(([n, title, desc]) => (
            <li key={n}>
              <span>{n}</span>
              <div>
                <h3>{title}</h3>
                <p lang="bn">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="section-heading-inline">
        <h2>On the calendar.</h2>
        <span>All times will show in Bangladesh time.</span>
      </div>
      <EmptyCatalog kind="mocks" />
      <FeatureNote>
        পরীক্ষা শেষ হলেই result দেখা যাবে না। Admin ওই mock-এর result publish
        করলে dashboard-এ পাবে। Scheduler, registration ও reminder backend পরের
        integration-এ যুক্ত হবে।
      </FeatureNote>
    </PageWrap>
  );
}
