"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { WritingEvaluation, TaskAssessment } from '../writing-evaluation';
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
    aiAssessment?: import('@/lib/evaluation/schema').WritingAssessment;
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
    resultPublished?: boolean;
    moduleSubmitted?: boolean;
    savedAnswers?: Record<string,string>;
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
    const dirty=useRef(false),saving=useRef(false),flushRef=useRef<()=>Promise<void>>(async()=>{});
    const [saveStatus,setSaveStatus]=useState('');
    const answerRef = useRef<Record<string, string>>({}), lock = useRef(false), offset = useRef(0), stateRef = useRef<State | null>(null);
    const apply = useCallback((s: State) => { offset.current = s.serverNow - Date.now(); stateRef.current = s; setState(s); setTime(s.deadline ? Math.max(0, Math.ceil((new Date(s.deadline).getTime() - s.serverNow) / 1000)) : 0); let next:Record<string,string> = s.savedAnswers||{}; try {
        const saved = sessionStorage.getItem('luma-attempt:' + id + ':' + s.index);
        if(saved){const parsed=JSON.parse(saved);if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))next=parsed;}
    }
    catch { } answerRef.current = next; dirty.current=true; setAnswers(next); }, [id]);
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
    const change = useCallback((qid: string, value: unknown) => { const next = { ...answerRef.current, [qid]: String(value ?? '') }; answerRef.current = next; dirty.current=true; setAnswers(next); try {
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
            if(r.status===409){const fresh=await fetch('/api/exam-attempts/'+id,{cache:'no-store'});if(fresh.ok){apply(await fresh.json());return;}}
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
    useEffect(()=>{
      const refresh=async()=>{try{const r=await fetch('/api/exam-attempts/'+id,{cache:'no-store'});if(!r.ok)return;const d=await r.json(),before=stateRef.current;offset.current=d.serverNow-Date.now();setError('');if(!before||d.index!==before.index||d.complete!==before.complete||d.moduleSubmitted!==before.moduleSubmitted||d.resultPublished!==before.resultPublished)apply(d);}catch{}};
      const poll=setInterval(()=>void refresh(),15000);return()=>clearInterval(poll);
    },[id,apply]);
    useEffect(()=>{const timer=setTimeout(()=>void flushRef.current(),600);return()=>clearTimeout(timer);},[answers]);
    useEffect(()=>{
      const flush=async()=>{const current=stateRef.current;if(!dirty.current||saving.current||lock.current||!current||current.complete||current.moduleSubmitted||!current.deadline)return;
        const pending=answerRef.current;saving.current=true;setSaveStatus('Saving answers…');
        try{const body=JSON.stringify({action:'save',index:current.index,answers:pending});const r=await fetch('/api/exam-attempts/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:new Blob([body]).size<60000});
          if(r.status===409){await load();return;}if(!r.ok)throw Error('Save failed');if(answerRef.current===pending)dirty.current=false;setSaveStatus('Answers saved');
        }catch{setSaveStatus('Not saved online — keep this tab open. Your answers remain on this device.');}finally{saving.current=false;}
      };
      flushRef.current=flush;
      let lastAttempt=0;const timer=setInterval(()=>{const current=stateRef.current;const remaining=current?.deadline?new Date(current.deadline).getTime()-Date.now()-offset.current:Infinity;const interval=remaining<5000?500:3000;if(Date.now()-lastAttempt>=interval){lastAttempt=Date.now();void flush();}},500);const onHide=()=>{if(document.visibilityState==='hidden')void flush();};document.addEventListener('visibilitychange',onHide);
      return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',onHide);};
    },[id,load]);
    // Legacy attempts may have been created before automatic module starts existed.
    // Recover them without showing an extra "Start listening/reading" screen.
    const autoStarted = useRef<string | null>(null);
    useEffect(() => {
        if (!state || state.complete || state.moduleSubmitted || state.deadline || busy || error) return;
        const key = state.id + ':' + state.index;
        if (autoStarted.current === key) return;
        autoStarted.current = key;
        void action('start').catch(() => { autoStarted.current = null; });
    }, [state, busy, error, action]);
    // Use server deadline rather than counting ticks: reload/background tabs cannot reset time.
    useEffect(() => { if (!state?.deadline || state.complete)
        return; const tick = () => setTime(Math.max(0, Math.ceil((new Date(state.deadline!).getTime() - Date.now() - offset.current) / 1000))); tick(); const timer = setInterval(tick, 500); return () => clearInterval(timer); }, [state?.deadline, state?.complete]);
    useEffect(()=>{if(!state?.moduleSubmitted||time!==0)return;void load();const timer=setInterval(()=>void load(),1000);return()=>clearInterval(timer);},[state?.moduleSubmitted,time,load]);
    const autoSubmitted = useRef('');
    useEffect(() => { if (state?.deadline && time === 0 && !state.complete && !state.moduleSubmitted && !busy && !error) {
        const key = state.id + ':' + state.index;
        if (autoSubmitted.current !== key) {
            autoSubmitted.current = key;
            void action('submit').catch(() => { });
        }
    } }, [time, state, busy, error, action]);
    // The writing draft is copied into the answer state on every edit in the shared renderer.
    const back = state?.kind==='mock'?'/mocks/'+state.parentId:state?.kind === 'cambridge' ? '/cambridge' : '/practice';
    if (!state)
        return <section className="exam-session-shell"><div className="exam-session-sheet"><h1>{error ? 'Unable to open this attempt' : 'Preparing your test…'}</h1>{error && <><p role="alert">{error}</p><button className="session-primary" onClick={() => void load()}>Try again</button></>}</div></section>;
    if(state.complete&&state.kind==='mock'&&!state.resultPublished)return <section className="exam-session-shell"><div className="exam-session-sheet"><span className="session-eyebrow">MOCK SUBMITTED</span><h1>Your paper is submitted.</h1><p>অ্যাডমিন ফল প্রকাশ করলে এখানে তোমার স্কোর ও feedback দেখতে পাবে।</p><button className="session-primary" onClick={()=>void load()}>Check published result</button><a href={back}>Back to mock ↗</a></div></section>;
    if(state.moduleSubmitted)return <section className="exam-session-shell"><div className="exam-session-sheet"><h1>{state.modules[state.index]?.module} submitted</h1><p>এই module-এর উত্তর আর বদলানো যাবে না। পরের module সবার জন্য নির্ধারিত সময়ে খুলবে।</p><p role="timer">{Math.floor(time/60)}:{String(time%60).padStart(2,'0')} remaining until the next scheduled stage</p><button onClick={()=>void load()}>Refresh</button></div></section>;
    if (state.complete) {
        const marked = state.results.filter(r => r.total !== null), correct = marked.reduce((n, r) => n + (r.correct ?? 0), 0), total = marked.reduce((n, r) => n + (r.total ?? 0), 0);
        return <section className="exam-session-shell"><div className="exam-session-sheet results-sheet"><span className="session-eyebrow">TEST COMPLETE</span><h1>Your effort, in focus.</h1><p>{state.title}</p><div className="result-total">{total>0?<strong>{correct}<small> / {total}</small></strong>:<strong className="result-submitted">Submitted</strong>}<span>{total>0?"Correct answers · Listening & Reading":"Your responses have been submitted"}</span></div><div className="result-module-grid">{state.results.map(r => <article key={r.module}><span className="session-eyebrow">{r.module}</span>{r.total === null ? <><h2>{state.kind==='mock'?'Writing band '+(r.bandScore?.toFixed(1)??'—'):'AI assessment'}</h2><p>{r.wordCount??0} words</p>{'feedback' in r&&<p>{String(r.feedback)}</p>}</> : <><h2>{r.correct}<small> / {r.total}</small></h2><p>{r.scorePercent}% correct{r.bandScore !== null ? ' · Estimated band ' + r.bandScore.toFixed(1) : ''}</p></>}</article>)}</div>{state.kind!=='mock'&&state.results.some(r=>r.module==='writing')&&<WritingEvaluation attemptId={state.id} tasks={state.results.find(r=>r.module==='writing')!.items.map((item,index)=>({task:index+1,answer:item.answer}))}/>}{state.kind==='mock'&&state.results.find(r=>r.module==='writing')?.aiAssessment?.tasks.map(task=><article className="writing-task-feedback" key={task.task}><h3>Writing Task {task.task}</h3><TaskAssessment feedback={task}/></article>)}<p lang="bn">নিচে তোমার উত্তর ও feedback মিলিয়ে দেখো।</p>{state.results.map(r => <details className="result-review" key={r.module}><summary>Review {r.module} answers</summary><div>{r.items.map(item => <article key={item.id}><div><strong>{item.label}</strong><span className={'answer-status ' + (item.correct === true ? 'correct' : item.correct === false ? 'incorrect' : '')}>{item.correct === true ? 'Correct' : item.correct === false ? 'Check answer' : 'Unmarked'}</span></div><p><span>Your answer</span>{item.answer || 'Not answered'}</p>{item.correctAnswer !== null && <p><span>Answer key</span>{item.correctAnswer || 'Not set'}</p>}</article>)}</div></details>)}<a className="session-primary" href={back}>Back to practice ↗</a><p className="session-note">{state.kind==='mock'?'Your published mock result is saved to your account.':'This result is available in this browser for 24 hours.'}</p></div></section>;
    }
    if (!state.deadline)
        return <section className="exam-session-shell"><div className="exam-session-sheet" role="status"><span className="session-eyebrow">MODULE {state.index + 1} OF {state.modules.length}</span><h1>Opening {state.current?.module}…</h1><p>Your test will start automatically. There is no additional step.</p>{error && <><p role="alert">{error}</p><button className="session-primary" disabled={busy} onClick={() => void action('start').catch(() => { })}>Retry opening module</button></>}<a className="session-back" href={back}>Leave test</a></div></section>;
    return <EngineSurface nonce={nonce}><Toaster /><p role="status">{saveStatus}</p>{error && <div className="attempt-error" role="alert">{error}<button disabled={busy} onClick={() => void action('submit').catch(() => { })}>Retry submission</button></div>}<ExamInterface key={state.index} nonce={nonce} testTitle={state.title + ' · ' + (state.index + 1) + ' / ' + state.modules.length} sectionType={state.current!.module} parts={state.current!.document.parts} questions={state.current!.document.questions} timeLeft={time} answers={answers} onAnswerChange={change} onFinish={() => action('submit')} onExit={() => { if (confirm('Leave this test? The current module timer will keep running.'))
        window.location.assign(back); }} disablePause sectionAudioUrl={state.current!.document.audioUrl}/></EngineSurface>;
}
