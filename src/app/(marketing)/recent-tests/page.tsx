import Link from 'next/link';
import {QuestionPracticePanel} from '@/components/cambridge-question-practice';
import {validBookSlug,otherBookSeries} from '@/lib/other-books';
import '@/styles/type-wise-question-practice.css';
import {publicPageMetadata} from '@/lib/seo';
import {PageIntro,PageWrap} from '@/components/page-parts';
import {PracticeCatalog} from '@/components/practice-catalog';
import {parsePage} from '@/lib/pagination';
import {ModuleFilterChips} from '@/components/module-filter-chips';
export const metadata=publicPageMetadata('IELTS Recent Tests','IELTS Listening, Reading ও Writing-এর Recent Tests বেছে প্রস্তুতি নাও।','/recent-tests');
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const p=await searchParams,questions=p.view==='questions';
 const raw=p.collection==='practice'?'recent-tests':p.collection;
 const collection=['cambridge','other-books','recent-tests'].includes(String(raw))?raw as 'cambridge'|'other-books'|'recent-tests':'all';
 const book=typeof p.book==='string'&&((collection==='cambridge'&&/^\d{1,4}$/.test(p.book))||(collection==='other-books'&&validBookSlug(p.book)))?p.book:undefined;
 const series=collection==='other-books'&&typeof p.series==='string'&&otherBookSeries.some(s=>s.slug===p.series)?p.series:undefined;
 return <PageWrap><PageIntro eyebrow="Recent Tests" title="Recent Tests" crumbs={questions?[{label:"Recent Tests",href:"/recent-tests"},{label:"Type Wise Question Practice"}]:[{label:"Recent Tests"}]}/><nav className="practice-view-tabs" aria-label="Test and question practice"><Link href="/recent-tests" aria-current={!questions?'page':undefined}>Recent Tests</Link><Link href="/recent-tests?view=questions" aria-current={questions?'page':undefined}>Type Wise Question Practice</Link></nav>{questions?<><QuestionPracticePanel collection={collection} book={book} series={series}/></>:<><ModuleFilterChips/><PracticeCatalog page={parsePage(p.page)}/></>}</PageWrap>
}
