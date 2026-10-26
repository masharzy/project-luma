import Link from "next/link";
import { PageIntro,PageWrap } from "@/components/page-parts";
export const metadata={title:"Speaking Cue Cards"};
export default function Page(){return <PageWrap><PageIntro eyebrow="RESOURCES" title="Speaking Cue Cards" description="Part 2 practice: take one minute to prepare, then speak for up to two minutes."/><div className="workspace-panel"><h2>Practise a topic</h2><p>Describe a place you enjoy visiting. Say where it is, what you do there, who you go with, and explain why you enjoy it.</p><Link className="button" href="/speaking-evaluation">Practise with Speaking Evaluation →</Link></div></PageWrap>;}
