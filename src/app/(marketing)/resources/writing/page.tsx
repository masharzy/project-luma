import Link from "next/link";
import {PageIntro,PageWrap} from "@/components/page-parts";
import {PublicResourceList} from "@/components/public-resource-list";
export const dynamic="force-dynamic";
export const metadata={title:"Writing Samples"};
export default function Page(){return <PageWrap tone="resources-page"><PageIntro eyebrow="WRITING / SAMPLES" title="Writing Samples" description="IELTS Writing Task 1 ও Task 2-এর নমুনা উত্তর।"><Link href="/resources" className="text-link">All resources ↗</Link></PageIntro><PublicResourceList category="writing"/></PageWrap>;}
