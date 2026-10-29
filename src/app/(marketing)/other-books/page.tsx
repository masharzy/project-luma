import { publicPageMetadata } from "@/lib/seo";
import { PageIntro,PageWrap } from '@/components/page-parts';
import { OtherBooksCatalog } from '@/components/other-books-catalog';
export const metadata = publicPageMetadata("IELTS Practice Books | More Books", "Collins, Barron’s ও অন্যান্য IELTS বইয়ের collection থেকে বই ও test বেছে অনুশীলন করো। JumpToNine-এ এক জায়গায় IELTS practice books।", "/other-books");
export default function Page(){return <PageWrap tone="library-page"><PageIntro eyebrow="MORE BOOKS" title="More Books"/><OtherBooksCatalog/></PageWrap>;}
