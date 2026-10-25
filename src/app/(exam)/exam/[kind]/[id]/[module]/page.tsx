import { notFound } from 'next/navigation';
import {db}from'@/lib/auth/db';
import {SpeakingStart}from'@/components/speaking-start';
import { AttemptLauncher } from '@/components/exam/attempt-launcher';
import { moduleOrder, selectedModules } from '@/lib/cambridge-settings';
import { examParent, loadExam } from '@/lib/exam/store';
import '@/styles/exam-session.css';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: {
    params: Promise<{
        kind: string;
        id: string;
        module: string;
    }>;
}) {
    const p = await params;
    if (!['cambridge', 'practice'].includes(p.kind) || ![...moduleOrder, 'speaking', 'full'].includes(p.module as any))
        notFound();
    const kind = p.kind as 'cambridge' | 'practice';
    const parent = await examParent(kind, p.id);
    if (!parent || parent.status !== 'published' || parent.access !== 'free')
        notFound();
    if(p.module==='speaking'){if(kind!=='cambridge'||!parent.modules.includes('speaking'))notFound();const set=(await db().query('SELECT id,document FROM public.speaking_sets WHERE cambridge_test_id=$1 AND published=true AND document IS NOT NULL',[p.id]))[0];if(!set)notFound();const count=set.document.sourceParts?.length||3;return <section className="exam-session-shell"><div className="exam-session-sheet"><a className="session-back" href="/cambridge">← Cambridge library</a><span className="session-eyebrow">SPEAKING · ANIMATED ROOM</span><h1>{parent.title} · Speaking</h1><p>{count} parts in source order. Listen to each question, then record your answer. Task cards and notes appear on the desk.</p><p>Sign in with Speaking Evaluation access to enter. AI feedback uses your separate Speaking Evaluation allowance.</p><SpeakingStart testId={String(set.id)}/></div></section>;}
    const chosen = selectedModules(parent.modules, p.module);
    if (!chosen.length)
        notFound();
    const modules = await Promise.all(chosen.map(async module=>{
        const data = await loadExam(kind,p.id,module);
        if(!data.revision||!data.document.parts.length||(module!=='writing'&&!data.document.questions.length))notFound();
        return {module,minutes:data.document.durationMinutes};
    }));
    return <AttemptLauncher kind={kind} parentId={p.id} selection={p.module} title={parent.title} modules={modules}/>;
}
