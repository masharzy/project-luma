import { PageIntro,PageWrap } from "@/components/page-parts";
import { OtherBooksCatalog } from "@/components/other-books-catalog";
import { listOtherBookTests } from "@/lib/other-books-catalog";
import "@/styles/other-books.css";
export const dynamic="force-dynamic";
export const metadata={title:"Other Books"};
export default async function Page(){return <PageWrap tone="library-page"><PageIntro eyebrow="OTHER BOOKS" title="More books. More ways to practise." description="Collins, Barron’s ও Practice Tests Plus—বই, module এবং question type বেছে practice করো।"/><OtherBooksCatalog tests={await listOtherBookTests()}/></PageWrap>;}
