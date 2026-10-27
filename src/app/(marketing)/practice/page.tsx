import { CambridgeQuestionPractice } from "@/components/cambridge-question-practice";
import { PageIntro, PageWrap, FeatureNote } from "@/components/page-parts";
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
      <CambridgeQuestionPractice collection="practice"/>
      <PracticeCatalog />
      <FeatureNote>
        Guest হিসেবেও free practice করা যাবে। Account ছাড়া দেওয়া test-এর history
        save হবে না।
      </FeatureNote>
    </PageWrap>
  );
}
