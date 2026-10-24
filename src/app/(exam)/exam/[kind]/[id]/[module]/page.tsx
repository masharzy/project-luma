import { notFound } from 'next/navigation';
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
    if (!['cambridge', 'practice'].includes(p.kind) || ![...moduleOrder, 'full'].includes(p.module as any))
        notFound();
    const kind = p.kind as 'cambridge' | 'practice';
    const parent = await examParent(kind, p.id);
    if (!parent || parent.status !== 'published' || parent.access !== 'free')
        notFound();
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
