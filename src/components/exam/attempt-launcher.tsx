"use client";
import { useState } from 'react';
import { Headphones, BookOpenText, PenLine, Clock3, Play } from 'lucide-react';
export function AttemptLauncher({ kind, parentId, selection, title, modules }: {
    kind: string;
    parentId: string;
    selection: string;
    title: string;
    modules: {
        module: string;
        minutes: number;
    }[];
}) {
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    async function start() { setBusy(true); setError(''); try {
        const r = await fetch('/api/exam-attempts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, parentId, selection }) });
        const d = await r.json();
        if (!r.ok)
            throw Error(d.error);
        window.location.assign('/exam/attempt/' + d.id);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Please try again');
        setBusy(false);
    } }
    return <section className="exam-session-shell"><div className="exam-session-sheet"><a className="session-back" href={kind === 'cambridge' ? '/cambridge' : '/practice'}>← Back to practice</a><span className="session-eyebrow">{selection === 'full' ? 'FULL TEST · LISTENING / READING / WRITING' : 'MODULE PRACTICE'}</span><h1>{title}</h1><p>Work through each module in order within its time limit. Submitted modules cannot be changed.</p>{selection==='full'&&<p lang="bn">Full Test দিতে verified account-এ login থাকতে হবে। Writing submit করলে AI Writing Evaluation স্বয়ংক্রিয়ভাবে শুরু হবে এবং একই Writing Evaluation monthly limit থেকে ১টি ব্যবহার হবে। AI ব্যর্থ হলে allowance ফেরত যাবে।</p>}{selection==='writing'&&<p>AI feedback requires a verified account and an active Writing allowance. Sign in before beginning. Guest answers can be reviewed without AI evaluation.</p>}<div className="session-module-list">{modules.map((m, i) => <div key={m.module}><span className={"session-module-icon session-module-icon-"+m.module}>{m.module==="listening"?<Headphones size={21}/>:m.module==="reading"?<BookOpenText size={21}/>:<PenLine size={21}/>}</span><strong>{m.module}</strong><span className="session-duration"><Clock3 size={15}/> {m.minutes} min</span></div>)}</div><p lang="bn">প্রতিটি module submit করার পর পরেরটি শুরু করতে পারবে। শেষে তোমার result দেখাবে।</p>{error && <p role="alert">{error}</p>}<button className="session-primary" disabled={busy} onClick={start}>{busy ? 'Preparing…' : <><Play size={18} fill="currentColor"/> Begin Practice</>}</button></div></section>;
}
