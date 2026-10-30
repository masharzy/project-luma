import Link from "next/link";
import {PageIntro,PageWrap} from "@/components/page-parts";
import {PublicResourceList} from "@/components/public-resource-list";
export const dynamic="force-dynamic";
export const metadata={title:"Good pages. Within reach."};
export default function Page(){return <PageWrap tone="resources-page"><PageIntro eyebrow="THE EBOOK SHELF" title="Good pages. Within reach." description="IELTS প্রস্তুতির বই ও workbook।"><Link href="/resources" className="text-link">All resources ↗</Link></PageIntro><PublicResourceList category="ebook"/></PageWrap>;}
