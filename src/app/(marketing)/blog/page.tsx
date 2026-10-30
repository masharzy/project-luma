import Link from "next/link";
import {PageIntro,PageWrap} from "@/components/page-parts";
import {PublicResourceList} from "@/components/public-resource-list";
export const dynamic="force-dynamic";
export const metadata={title:"Study Journal"};
export default function Page(){return <PageWrap tone="resources-page"><PageIntro eyebrow="THE JUMPTONINE JOURNAL" title="Study Journal" description="IELTS প্রস্তুতির কৌশল ও শেখার অভ্যাস।"><Link href="/resources" className="text-link">All resources ↗</Link></PageIntro><PublicResourceList category="journal"/></PageWrap>;}
