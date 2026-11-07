import Link from "next/link";
import {PageIntro,PageWrap} from "@/components/page-parts";
import {readSession} from "@/lib/auth/session";
import {parseFilters,practiceQuestions} from "@/lib/vocabulary";
import {PracticeQuiz} from "@/components/vocabulary/practice-quiz";
export const metadata={title:"IELTS Vocabulary Quiz"};
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const f=parseFilters(await searchParams);
 const userId=(await readSession().catch(()=>null))?.user?.id??null;
 const questions=await practiceQuestions(userId,f);
 return <PageWrap tone="resources-page"><PageIntro eyebrow="VOCABULARY QUIZ" title="Pick the word that fits." description="Sentence-e ঠিক শব্দটা বেছে নাও।"><Link href="/vocabulary" className="text-link">← Back to words</Link></PageIntro>
  <section className="workspace-panel"><PracticeQuiz questions={questions}/></section></PageWrap>;
}
