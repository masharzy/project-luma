import { CambridgeQuestionPractice } from '@/components/cambridge-question-practice';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Headphones, BookOpenText, PenLine, Mic2, ArrowUpRight } from 'lucide-react';
import { PageIntro, PageWrap } from '@/components/page-parts';
import { PracticeTestCards } from '@/components/practice-test-cards';
import { db } from '@/lib/auth/db';
import { listCambridgeBooks, listCambridgeTests } from '@/lib/cambridge';
import { testModuleOrder as moduleOrder, moduleOrder as fullModules } from '@/lib/cambridge-settings';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: {
    params: Promise<{
        book: string;
    }>;
}) {
    const { book } = await params;
    if (!/^\d{1,4}$/.test(book))
        notFound();
    const current = (await listCambridgeBooks()).find(b => b.bookNumber === Number(book));
    if (!current)
        notFound();
    const tests = (await listCambridgeTests()).filter(t => t.bookNumber === current.bookNumber);
    const saved = tests.length ? await db().query("SELECT parent_id,module FROM public.exam_modules WHERE kind='cambridge' AND parent_id=ANY($1::bigint[]) AND jsonb_array_length(document->'parts')>0 AND (module='writing' OR jsonb_array_length(document->'questions')>0)", [tests.map(t => t.id)]) : [];
    const available = new Set(saved.map(r => String(r.parent_id) + ':' + r.module));
    const speaking = tests.length ? await db().query('SELECT cambridge_test_id FROM public.speaking_sets WHERE published=true AND document IS NOT NULL AND cambridge_test_id=ANY($1::bigint[])',[tests.map(t=>t.id)]) : [];
    speaking.forEach(r=>available.add(String(r.cambridge_test_id)+':speaking'));
    return <PageWrap tone="library-page"><PageIntro eyebrow="Cambridge" title={current.title} crumbs={[{label:"Cambridge",href:"/cambridge"},{label:current.title}]}/>
 <CambridgeQuestionPractice book={book}/>
 <div className="lib-book-head"><span className={'lib-access'+(current.access==='premium'?' is-premium':'')}>{current.access==='premium'?'Premium book':tests.some(t=>t.access==='premium')?'Free & Premium tests':'Free access'}</span><span>{tests.length} tests</span></div>
 <PracticeTestCards hrefBase="/exam/cambridge" notes tests={tests.map(t=>({id:String(t.id),title:t.title||'Test '+t.testNumber,number:t.testNumber,access:current.access==='premium'||t.access==='premium'?'premium' as const:'free' as const,durations:t.durations,sections:[...t.sections],modules:moduleOrder.filter(m=>available.has(t.id+':'+m))}))}/>{!tests.length && <div className="workspace-panel admin-empty">Tests are being prepared for this book.</div>}
 </PageWrap>;
}
