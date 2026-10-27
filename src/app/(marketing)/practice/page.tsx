import Link from 'next/link';
import {PageIntro,PageWrap} from '@/components/page-parts';
import {PracticeCatalog} from '@/components/practice-catalog';
import {QuestionPracticePanel} from '@/components/cambridge-question-practice';
import {validBookSlug,otherBookSeries} from '@/lib/other-books';
export const metadata={title:'Practice'};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const p=await searchParams,questions=p.view==='questions';
 const collection=['cambridge','other-books','practice'].includes(String(p.collection))?p.collection as 'cambridge'|'other-books'|'practice':'all';
 const book=typeof p.book==='string'&&((collection==='cambridge'&&/^\d{1,4}$/.test(p.book))||(collection==='other-books'&&validBookSlug(p.book)))?p.book:undefined;
 const series=collection==='other-books'&&typeof p.series==='string'&&otherBookSeries.some(s=>s.slug===p.series)?p.series:undefined;
 return <PageWrap><PageIntro eyebrow="PRACTICE" title="Practice, your way." description="একটি test দাও, অথবা নির্দিষ্ট ধরনের প্রশ্ন বেছে ছোট practice করো।"/><nav className="practice-view-tabs" aria-label="Practice mode"><Link href="/practice" aria-current={!questions?'page':undefined}>Test Practice</Link><Link href="/practice?view=questions" aria-current={questions?'page':undefined}>Question Practice</Link></nav>{questions?<><p className="question-practice-intro">Listening বা Reading আর প্রশ্নের ধরন বেছে শুরু করো।{collection!=='all'&&<> এই collection-এর প্রশ্ন দেখানো হচ্ছে। <Link href="/practice?view=questions">সব collection দেখো ↗</Link></>}</p><QuestionPracticePanel collection={collection} book={book} series={series}/></>:<PracticeCatalog/>}</PageWrap>;
}
