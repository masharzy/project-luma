import Link from 'next/link';
import {publicPageMetadata} from '@/lib/seo';
import {PageWrap} from '@/components/page-parts';
import {QuestionPracticePanel} from '@/components/cambridge-question-practice';
import {validBookSlug,otherBookSeries} from '@/lib/other-books';
import '@/styles/type-wise-question-practice.css';
export const metadata=publicPageMetadata('Type Wise Question Practice','Listening বা Reading-এর question type বেছে নিজের practice session তৈরি করো।','/type-wise-question-practice');
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const p=await searchParams;const raw=p.collection==='practice'?'recent-tests':p.collection;const collection=['cambridge','other-books','recent-tests'].includes(String(raw))?raw as 'cambridge'|'other-books'|'recent-tests':'all';const book=typeof p.book==='string'&&((collection==='cambridge'&&/^\d{1,4}$/.test(p.book))||(collection==='other-books'&&validBookSlug(p.book)))?p.book:undefined;const series=collection==='other-books'&&typeof p.series==='string'&&otherBookSeries.some(s=>s.slug===p.series)?p.series:undefined;return <PageWrap><div className="typewise-heading"><div><span>FOCUS YOUR PRACTICE</span><h1>Type Wise Question Practice</h1><p>যে ধরনের প্রশ্নে আটকে যাও, সেখান থেকেই শুরু করো।</p></div><Link href="/recent-tests">Recent Tests ↗</Link></div><QuestionPracticePanel collection={collection} book={book} series={series}/></PageWrap>}
