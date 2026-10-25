"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { WritingEvaluation } from '../writing-evaluation';
import { EngineSurface } from './engine-surface';
import { Toaster } from './feedback';
import type { ExamDocument, Module } from '@/lib/exam/document';
import '@/styles/exam-engine.css';
const ExamInterface = dynamic(() => import('./exam-interface'), { ssr: false });
type Item = {
    id: string;
    label: string;
    answer: string;
    correctAnswer: string | null;
    correct: boolean | null;
};
type Result = {
    module: Module;
    correct: number | null;
    total: number | null;
    scorePercent: number | null;
    bandScore: number | null;
    wordCount?: number;
    status: string;
    items: Item[];
};
type State = {
    id: string;
    title: string;
    kind: string;
    parentId: string;
    index: number;
    complete: boolean;
    deadline: string | null;
    serverNow: number;
    modules: {
        module: Module;
        minutes: number;
    }[];
    current: {
        module: Module;
        document: ExamDocument;
    } | null;
    results: Result[];
};
export function AttemptRunner({ id, nonce }: {
    id: string;
    nonce?: string;
}) {
    const [state, setState] = useState<State | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [time, setTime] = useState(0), [answers, setAnswers] = useState<Record<string, string>>({});
    const answerRef = useRef<Record<string, string>>({}), lock = useRef(false), offset = useRef(0), stateRef = useRef<State | null>(null);
    const apply = useCallback((s: State) => { offset.current = s.serverNow - Date.now(); stateRef.current = s; setState(s); setTime(s.deadline ? Math.max(0, Math.ceil((new Date(s.deadline).getTime() - s.serverNow) / 1000)) : 0); let next = {}; try {
        const saved = sessionStorage.getItem('luma-attempt:' + id + ':' + s.index);
        next = saved ? JSON.parse(saved) : {};
    }
    catch { } answerRef.current = next; setAnswers(next); }, [id]);
    const load = useCallback(async () => { try {
        const r = await fetch('/api/exam-attempts/' + id, { cache: 'no-store' }), d = await r.json();
        if (!r.ok)
            throw Error(d.error);
        apply(d);
        setError('');
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load test');
    } }, [id, apply]);
    useEffect(() => { void load(); }, [load]);
    const change = useCallback((qid: string, value: unknown) => { const next = { ...answerRef.current, [qid]: String(value ?? '') }; answerRef.current = next; setAnswers(next); try {
        sessionStorage.setItem('luma-attempt:' + id + ':' + stateRef.current?.index, JSON.stringify(next));
    }
    catch { } }, [id]);
    const action = useCallback(async (action: 'start' | 'submit') => {
        if (lock.current || !stateRef.current)
            return;
        lock.current = true;
        setBusy(true);
        setError('');
        const before = stateRef.current;
        try {
            const r = await fetch('/api/exam-attempts/' + id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, index: before.index, ...(action === 'submit' ? { answers: answerRef.current } : {}) }) });
            const d = await r.json();
            if (!r.ok)
                throw Error(d.error);
            if (action === 'submit')
                sessionStorage.removeItem('luma-attempt:' + id + ':' + before.index);
            apply(d);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Submission failed');
            throw e;
        }
        finally {
            lock.current = false;
            setBusy(false);
        }
    }, [id, apply]);
    // Legacy attempts may have been created before automatic module starts existed.
    // Recover them without showing an extra "Start listening/reading" screen.
    const autoStarted = useRef<string | null>(null);
    useEffect(() => {
        if (!state || state.complete || state.deadline || busy || error) return;
        const key = state.id + ':' + state.index;
        if (autoStarted.current === key) return;
        autoStarted.current = key;
        void action('start').catch(() => { autoStarted.current = null; });
    }, [state, busy, error, action]);
    // Use server deadline rather than counting ticks: reload/background tabs cannot reset time.
    useEffect(() => { if (!state?.deadline || state.complete)
        return; const tick = () => setTime(Math.max(0, Math.ceil((new Date(state.deadline!).getTime() - Date.now() - offset.current) / 1000))); tick(); const timer = setInterval(tick, 500); return () => clearInterval(timer); }, [state?.deadline, state?.complete]);
    const autoSubmitted = useRef('');
    useEffect(() => { if (state?.deadline && time === 0 && !state.complete && !busy && !error) {
        const key = state.id + ':' + state.index;
        if (autoSubmitted.current !== key) {
            autoSubmitted.current = key;
            void action('submit').catch(() => { });
        }
    } }, [time, state, busy, error, action]);
    // The writing draft is copied into the answer state on every edit in the shared renderer.
    const back = state?.kind === 'cambridge' ? '/cambridge' : '/practice';
    if (!state)
        return <section className="exam-session-shell"><div className="exam-session-sheet"><h1>{error ? 'Unable to open this attempt' : 'Preparing your test…'}</h1>{error && <><p role="alert">{error}</p><button className="session-primary" onClick={() => void load()}>Try again</button></>}</div></section>;
    if (state.complete) {
        const marked = state.results.filter(r => r.total !== null), correct = marked.reduce((n, r) => n + (r.correct ?? 0), 0), total = marked.reduce((n, r) => n + (r.total ?? 0), 0);
        return <section className="exam-session-shell"><div className="exam-session-sheet results-sheet"><span className="session-eyebrow">TEST COMPLETE</span><h1>Your effort, in focus.</h1><p>{state.title}</p><div className="result-total">{total>0?<strong>{correct}<small> / {total}</small></strong>:<strong className="result-submitted">Submitted</strong>}<span>{total>0?"Correct answers · Listening & Reading":"Your responses have been submitted"}</span></div><div className="result-module-grid">{state.results.map(r => <article key={r.module}><span className="session-eyebrow">{r.module}</span>{r.total === null ? <><h2>AI assessment</h2><p>{r.wordCount ?? 0} words · Your estimated band and corrections appear below automatically</p></> : <><h2>{r.correct}<small> / {r.total}</small></h2><p>{r.scorePercent}% correct{r.bandScore !== null ? ' · Estimated band ' + r.bandScore.toFixed(1) : ''}</p></>}</article>)}</div>{state.results.some(r=>r.module==='writing')&&<WritingEvaluation attemptId={state.id} tasks={state.results.find(r=>r.module==='writing')!.items.map((item,index)=>({task:index+1,answer:item.answer}))}/>}<p lang="bn">নিচে তোমার উত্তর ও feedback মিলিয়ে দেখো।</p>{state.results.map(r => <details className="result-review" key={r.module}><summary>Review {r.module} answers</summary><div>{r.items.map(item => <article key={item.id}><div><strong>{item.label}</strong><span className={'answer-status ' + (item.correct === true ? 'correct' : item.correct === false ? 'incorrect' : '')}>{item.correct === true ? 'Correct' : item.correct === false ? 'Check answer' : 'Unmarked'}</span></div><p><span>Your answer</span>{item.answer || 'Not answered'}</p>{item.correctAnswer !== null && <p><span>Answer key</span>{item.correctAnswer || 'Not set'}</p>}</article>)}</div></details>)}<a className="session-primary" href={back}>Back to practice ↗</a><p className="session-note">This result is available in this browser for 24 hours.</p></div></section>;
    }
    if (!state.deadline)
        return <section className="exam-session-shell"><div className="exam-session-sheet" role="status"><span className="session-eyebrow">MODULE {state.index + 1} OF {state.modules.length}</span><h1>Opening {state.current?.module}…</h1><p>Your test will start automatically. There is no additional step.</p>{error && <><p role="alert">{error}</p><button className="session-primary" disabled={busy} onClick={() => void action('start').catch(() => { })}>Retry opening module</button></>}<a className="session-back" href={back}>Leave test</a></div></section>;
    return <EngineSurface nonce={nonce}><Toaster />{error && <div className="attempt-error" role="alert">{error}<button disabled={busy} onClick={() => void action('submit').catch(() => { })}>Retry submission</button></div>}<ExamInterface key={state.index} nonce={nonce} testTitle={state.title + ' · ' + (state.index + 1) + ' / ' + state.modules.length} sectionType={state.current!.module} parts={state.current!.document.parts} questions={state.current!.document.questions} timeLeft={time} answers={answers} onAnswerChange={change} onFinish={() => action('submit')} onExit={() => { if (confirm('Leave this test? The current module timer will keep running.'))
        window.location.assign(back); }} disablePause sectionAudioUrl={state.current!.document.audioUrl}/></EngineSurface>;
}
