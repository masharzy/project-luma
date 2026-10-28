import { PageIntro,PageWrap } from '@/components/page-parts';
import { OtherBooksCatalog } from '@/components/other-books-catalog';
export const metadata={title:'More Books'};
export default function Page(){return <PageWrap tone="library-page"><PageIntro eyebrow="MORE BOOKS" title="More Books"/><OtherBooksCatalog/></PageWrap>;}
