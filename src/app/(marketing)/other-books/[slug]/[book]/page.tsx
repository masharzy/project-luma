import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PracticeTestCards } from '@/components/practice-test-cards';
import { PageIntro,PageWrap } from '@/components/page-parts';
import { CambridgeQuestionPractice } from '@/components/cambridge-question-practice';
import { otherBooks,otherBookSeries } from '@/lib/other-books';
import { listOtherBookTests } from '@/lib/other-books-catalog';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{slug:string;book:string}>}){const {book}=await params;const current=otherBooks.find(b=>b.slug===book);return {title:current?`${current.series} · ${current.volume}`:'Other Books'};}
export default async function Page({params}:{params:Promise<{slug:string;book:string}>}){
 const {slug,book}=await params,series=otherBookSeries.find(s=>s.slug===slug),current=otherBooks.find(b=>b.slug===book&&b.series===series?.name);if(!current||!series)notFound();
 const tests=await listOtherBookTests(book);
 return <PageWrap tone="library-page"><PageIntro eyebrow={series.name.toUpperCase()} title={`${current.series} · ${current.volume}`}><Link className="text-link" href={'/other-books/'+slug}>← All {series.name} books</Link></PageIntro>
 <CambridgeQuestionPractice collection="other-books" book={book}/>
 <PracticeTestCards tests={tests.map(test=>({...test,modules:test.modules.map(m=>m.module)}))}/>

 {!tests.length&&<div className="workspace-panel admin-empty">Tests are being prepared for this book.</div>}</PageWrap>;
}
