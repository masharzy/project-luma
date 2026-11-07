"use client";
import Link from 'next/link';
import { useState } from 'react';
import { Headphones, BookOpenText, PenLine, Clock3, Play, ArrowLeft } from 'lucide-react';
export function AttemptLauncher({ kind, parentId, selection, title, modules, backHref }: {
    backHref?: string;
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
    const label = (m: string) => m[0].toUpperCase() + m.slice(1);
    const total = modules.reduce((n, m) => n + m.minutes, 0);
    return <section className="exam-session-shell launcher-shell"><div className="exam-session-sheet launcher-sheet">
        <Link className="launcher-back" href={backHref ?? (kind === 'cambridge' ? '/cambridge' : '/recent-tests')} prefetch={true}><ArrowLeft size={16} aria-hidden/> My tests</Link>
        <header className="launcher-head"><span className="launcher-kind">{selection === 'full' ? 'Full test' : label(selection) + ' practice'}</span><h1>{title}</h1><p>{modules.length > 1 ? `${modules.length} modules · ${total} minutes` : `${total} minutes`}</p></header>
        <ul className="launcher-modules" aria-label="Modules">{modules.map(m => <li key={m.module}><span className="launcher-icon">{m.module === 'listening' ? <Headphones size={20}/> : m.module === 'reading' ? <BookOpenText size={20}/> : <PenLine size={20}/>}</span><strong>{label(m.module)}</strong><span className="launcher-time"><Clock3 size={14} aria-hidden/> {m.minutes} min</span></li>)}</ul>
        <ul className="launcher-rules">
            <li>The timer starts when you begin.</li>
            <li>A submitted module cannot be changed.</li>
            {selection === 'full' && <li lang="bn">Full Test দিতে verified account-এ login থাকতে হবে। Writing submit করলে AI Writing Evaluation শুরু হবে এবং আপনার Writing allowance থেকে ১টি ব্যবহার হবে। AI ব্যর্থ হলে allowance ফেরত যাবে।</li>}
            {selection === 'writing' && <li>AI feedback needs a verified account and an active Writing allowance. Sign in before you begin.</li>}
        </ul>
        {error && <p role="alert" className="launcher-error">{error}</p>}
        <button className="launcher-start" disabled={busy} onClick={start}>{busy ? 'Preparing…' : <><Play size={18} fill="currentColor"/> Begin practice</>}</button>
    </div></section>;
}
