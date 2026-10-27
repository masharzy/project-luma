import { PageIntro,PageWrap } from '@/components/page-parts';
import { OtherBooksCatalog } from '@/components/other-books-catalog';
export const metadata={title:'Other Books'};
export default function Page(){return <PageWrap tone="library-page"><PageIntro eyebrow="OTHER BOOKS" title="Other Books"/><OtherBooksCatalog/></PageWrap>;}
