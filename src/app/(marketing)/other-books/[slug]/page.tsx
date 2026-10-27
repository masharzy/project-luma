import Link from 'next/link';
import { notFound,redirect } from 'next/navigation';
import { PageIntro,PageWrap } from '@/components/page-parts';
import { OtherBooksCatalog } from '@/components/other-books-catalog';
import { CambridgeQuestionPractice } from '@/components/cambridge-question-practice';
import { otherBooks,otherBookSeries,bookHref } from '@/lib/other-books';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return {title:otherBookSeries.find(s=>s.slug===slug)?.name||'Other Books'};}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const series=otherBookSeries.find(s=>s.slug===slug);if(!series){if(otherBooks.some(b=>b.slug===slug))redirect(bookHref(slug));notFound();}return <PageWrap tone="library-page"><PageIntro eyebrow="OTHER BOOKS" title={series.name}><Link className="text-link" href="/other-books">← All collections</Link></PageIntro><CambridgeQuestionPractice collection="other-books" series={slug}/><OtherBooksCatalog series={slug}/></PageWrap>;}
