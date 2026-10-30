import Link from "next/link";
import {PageIntro,PageWrap} from "@/components/page-parts";
import {PublicResourceList} from "@/components/public-resource-list";
export const dynamic="force-dynamic";
export const metadata={title:"Grammar Practice"};
export default function Page(){return <PageWrap tone="resources-page"><PageIntro eyebrow="GRAMMAR PRACTICE" title="Grammar Practice" description="সাধারণ ভুল ও সঠিক বাক্যের গঠন।"><Link href="/resources" className="text-link">All resources ↗</Link></PageIntro><PublicResourceList category="grammar"/></PageWrap>;}
