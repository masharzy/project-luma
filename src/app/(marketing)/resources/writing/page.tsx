import Link from "next/link";
import {PageIntro,PageWrap} from "@/components/page-parts";
import {PublicResourceList} from "@/components/public-resource-list";
export const dynamic="force-dynamic";
export const metadata={title:"Writing Samples & Guides"};
export default function Page(){return <PageWrap tone="resources-page"><PageIntro eyebrow="WRITING / SAMPLES & GUIDES" title="Writing Samples & Guides" description="IELTS Writing Task 1 ও Task 2-এর নমুনা ও গাইড।"><Link href="/resources" className="text-link">All resources ↗</Link></PageIntro><PublicResourceList category="writing"/></PageWrap>;}
