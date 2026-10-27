import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Headphones,BookOpenText,PenLine,Mic2,ArrowUpRight } from 'lucide-react';
import { PageIntro,PageWrap } from '@/components/page-parts';
import { CambridgeQuestionPractice } from '@/components/cambridge-question-practice';
import { otherBooks,otherBookSeries } from '@/lib/other-books';
import { listOtherBookTests } from '@/lib/other-books-catalog';
import { testModuleOrder,defaultDurations } from '@/lib/cambridge-settings';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{slug:string;book:string}>}){const {book}=await params;const current=otherBooks.find(b=>b.slug===book);return {title:current?`${current.series} · ${current.volume}`:'Other Books'};}
export default async function Page({params}:{params:Promise<{slug:string;book:string}>}){
 const {slug,book}=await params,series=otherBookSeries.find(s=>s.slug===slug),current=otherBooks.find(b=>b.slug===book&&b.series===series?.name);if(!current||!series)notFound();
 const tests=await listOtherBookTests(book);
 return <PageWrap tone="library-page"><PageIntro eyebrow={series.name.toUpperCase()} title={`${current.series} · ${current.volume}`}><Link className="text-link" href={'/other-books/'+slug}>← All {series.name} books</Link></PageIntro>
 <CambridgeQuestionPractice collection="other-books" book={book}/>
 <div className="cambridge-tests">{tests.map((test,index)=>{const locked=test.access==='premium',ready=new Set(test.modules.map(m=>m.module)),minutes={...defaultDurations,...test.durations};return <article className="cambridge-test-row" key={test.id}><div className="test-row-heading"><div><span className="eyebrow">TEST {String(index+1).padStart(2,'0')}</span><h2>{test.title}</h2></div><span className="access-pill">{locked?'Premium':'Free access'}</span></div><div className="test-row-body"><div className="test-module-area"><p className="module-caption">Take the test by module</p><div className="test-module-grid">{testModuleOrder.map(module=>{const Icon=module==='listening'?Headphones:module==='reading'?BookOpenText:module==='writing'?PenLine:Mic2;const available=ready.has(module);const content=<><span className={'module-letter module-icon-'+module}><Icon size={25}/></span><span><strong>{module[0].toUpperCase()+module.slice(1)}</strong><small>{minutes[module]} minutes{!available?' · Coming soon':locked?' · Premium':''}</small></span><ArrowUpRight size={19}/></>;return !locked&&available?<Link className="test-module-card" key={module} href={`/exam/practice/${test.id}/${module}`}>{content}</Link>:<div className="test-module-card unavailable" key={module} aria-disabled>{content}</div>;})}</div></div><div className="full-test-action"><span>{minutes.listening+minutes.reading} min · Listening + Reading</span>{!locked&&ready.has('listening')&&ready.has('reading')?<Link className="button" href={`/exam/practice/${test.id}/full`}>Start Full Test (LR only) ↗</Link>:<button className="button" disabled>{locked?'Premium access':'Full test coming soon'}</button>}</div></div></article>;})}</div>
 {!tests.length&&<div className="workspace-panel admin-empty">Tests are being prepared for this book.</div>}</PageWrap>;
}
