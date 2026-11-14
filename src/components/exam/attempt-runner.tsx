"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { WritingEvaluation, TaskAssessment } from '../writing-evaluation';
import { EngineSurface } from './engine-surface';
import { Toaster } from './feedback';
import { ExamLock } from './exam-lock';
import { startMockAudio, type AudioStatus } from '@/lib/exam/mock-audio';
import { readDraft, writeDraft, markSynced, clearDrafts, restoreAnswers } from '@/lib/exam/answer-draft';
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
    module: Module|'speaking';
    correct: number | null;
    total: number | null;
    scorePercent: number | null;
    bandScore: number | null;
    speakingAssessment?: import('@/lib/products/speaking-provider').SpeakingAssessment;
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
    mock?: { startsAt: number; examStart: number; moduleStart: number | null; moduleEnd: number | null; nextStart: number | null; nextModule: string | null };
    upcoming?: { module: string; audio: string[] } | null;
    savedAnswers?: Record<string,string>;
    modules: {
        module: Module|'speaking';
        minutes: number;
    }[];
    current: {
        module: Module|'speaking';
        document: ExamDocument;
    } | null;
    results: Result[];
};
export function AttemptRunner(props: { id: string; nonce?: string }) {
    const [lock, setLock] = useState(false);
    return <><ExamLock active={lock} /><AttemptRunnerBody {...props} onLock={setLock} /></>;
}
function AttemptRunnerBody({ id, nonce, onLock }: {
    id: string;
    nonce?: string;
    onLock: (active: boolean) => void;
}) {
    const [state, setState] = useState<State | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [time, setTime] = useState(0), [answers, setAnswers] = useState<Record<string, string>>({});
    // Scheduled mock: a shared server clock drives every screen. `clock` is the server time in ms, refreshed 4x a second.
    const [clock, setClock] = useState(0), [audio, setAudio] = useState<AudioStatus | null>(null);
    const audioCtl = useRef<ReturnType<typeof startMockAudio> | null>(null), audioKey = useRef('');
    const dirty=useRef(false),saving=useRef(false),flushRef=useRef<()=>Promise<void>>(async()=>{});
    const [saveStatus,setSaveStatus]=useState('');
    const answerRef = useRef<Record<string, string>>({}), lock = useRef(false), offset = useRef(0), stateRef = useRef<State | null>(null);
    const apply = useCallback((s: State) => { offset.current = s.serverNow - Date.now(); stateRef.current = s; setState(s); setTime(s.deadline ? Math.max(0, Math.ceil((new Date(s.deadline).getTime() - s.serverNow) / 1000)) : 0); // Drafts of finished modules are useless once the server has moved on; unsynced edits of the open module win.
    clearDrafts(id, s.complete ? Infinity : s.index);
    const restored = s.current ? restoreAnswers(s.savedAnswers||{}, readDraft(id, s.index)) : { answers: {}, dirty: false };
    answerRef.current = restored.answers; dirty.current = restored.dirty; setAnswers(restored.answers); }, [id]);
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
    // A mock lives on its own page (one full-screen session). The plain attempt URL sends people there.
    useEffect(() => { if (state?.kind === 'mock' && !state.complete && location.pathname.startsWith('/exam/')) location.replace('/mocks/' + state.parentId); }, [state?.kind, state?.complete, state?.parentId]);
    // Every keystroke is written to this device at once (survives reload and a closed browser), then synced to the server.
    const change = useCallback((qid: string, value: unknown) => { const next = { ...answerRef.current, [qid]: String(value ?? '') }; answerRef.current = next; dirty.current=true; setAnswers(next);
        if (stateRef.current) writeDraft(id, stateRef.current.index, next, false); }, [id]);
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
                clearDrafts(id, before.index + 1);
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
      const poll=setInterval(()=>void refresh(),stateRef.current?.kind==='mock'?(()=>{const m=stateRef.current?.mock,t=Date.now()+offset.current,edges=[m?.moduleStart,m?.moduleEnd,m?.nextStart].filter((v):v is number=>typeof v==='number'&&v>t-3000);return edges.length&&Math.min(...edges)-t<25000?1500:6000;})():15000);return()=>clearInterval(poll);
    },[id,apply,state?.index,state?.moduleSubmitted,state?.mock?.moduleStart]);
    useEffect(()=>{const t=setInterval(()=>setClock(Date.now()+offset.current),250);return()=>clearInterval(t);},[]);
    useEffect(()=>{onLock(Boolean(state?.kind==='mock'&&!state.complete));},[state?.kind,state?.complete,onLock]);
    // Every phase boundary re-reads the server at once (module ends, next module opens) so nobody waits for the next poll.
    useEffect(()=>{const m=state?.mock;if(!m)return;const edges=[m.moduleStart,m.moduleEnd,m.nextStart].filter((v):v is number=>typeof v==='number');const timers=edges.map(e=>{const d=e-(Date.now()+offset.current)+80;return d>0?window.setTimeout(()=>void load(),d):0;});return()=>timers.forEach(t=>t&&clearTimeout(t));},[state?.mock?.moduleStart,state?.mock?.moduleEnd,state?.mock?.nextStart,state?.index,load]);
    // Listening audio: preload as soon as the URLs are known, play at the shared start second.
    useEffect(()=>{
      const m=state?.mock;if(!m||state?.complete)return;
      const live=state?.current?.module==='listening'?state.current.document:null;
      const urls=state?.upcoming?.module==='listening'?state.upcoming.audio:live?(live.audioUrl?[live.audioUrl]:live.parts.map((p:any)=>p.audio_url).filter(Boolean)):[];
      const key=state.index+'|'+(m.moduleStart??'')+'|'+urls.join(',');
      if(!urls.length||m.moduleStart===null){if(audioKey.current){audioCtl.current?.stop();audioCtl.current=null;audioKey.current='';setAudio(null);}return;}
      if(audioKey.current===key)return;
      audioCtl.current?.stop();audioKey.current=key;
      audioCtl.current=startMockAudio(urls,m.moduleStart,()=>Date.now()+offset.current,setAudio);
    },[state]);
    useEffect(()=>()=>{audioCtl.current?.stop();},[]);
    // The Speaking room is a separate document; it tells us when the candidate finished.
    useEffect(()=>{const on=(e:MessageEvent)=>{if(e.origin===location.origin&&e.data?.type==='mock-speaking-done')void load();};window.addEventListener('message',on);return()=>window.removeEventListener('message',on);},[load]);

    useEffect(()=>{const timer=setTimeout(()=>void flushRef.current(),600);return()=>clearTimeout(timer);},[answers]);
    useEffect(()=>{
      const flush=async()=>{const current=stateRef.current;if(!dirty.current||saving.current||lock.current||!current||current.complete||current.moduleSubmitted||!current.deadline)return;
        const pending=answerRef.current;saving.current=true;setSaveStatus('Saving answers…');
        try{const body=JSON.stringify({action:'save',index:current.index,answers:pending});const r=await fetch('/api/exam-attempts/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:new Blob([body]).size<60000});
          if(r.status===409){await load();return;}if(!r.ok)throw Error('Save failed');markSynced(id,current.index,pending);if(answerRef.current===pending)dirty.current=false;setSaveStatus('All answers saved');
        }catch{setSaveStatus('Offline — your answers are kept on this device and will sync automatically.');}finally{saving.current=false;}
      };
      flushRef.current=flush;
      let lastAttempt=0;const timer=setInterval(()=>{const current=stateRef.current;const remaining=current?.deadline?new Date(current.deadline).getTime()-Date.now()-offset.current:Infinity;const interval=remaining<5000?500:3000;if(Date.now()-lastAttempt>=interval){lastAttempt=Date.now();void flush();}},500);const onHide=()=>{if(document.visibilityState==='hidden')void flush();};const now=()=>void flush();document.addEventListener('visibilitychange',onHide);window.addEventListener('pagehide',now);window.addEventListener('online',now);
      return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',onHide);window.removeEventListener('pagehide',now);window.removeEventListener('online',now);};
    },[id,load]);
    // Legacy attempts may have been created before automatic module starts existed.
    // Recover them without showing an extra "Start listening/reading" screen.
    const autoStarted = useRef<string | null>(null);
    useEffect(() => {
        if (!state || state.complete || state.current?.module==='speaking' || state.moduleSubmitted || state.deadline || busy || error) return;
        // Audio-backed Listening is started by the player's "playing" event.
        if (state.current?.module === 'listening' &&
            (state.current.document.audioUrl || state.current.document.parts.some((p: any) => p.audio_url))) return;
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
    const back = state?.kind==='mock'?'/mocks/'+state.parentId:state?.kind === 'cambridge' ? '/cambridge' : '/recent-tests';
    if (!state)
        return <section className="exam-session-shell"><div className="exam-session-sheet"><h1>{error ? 'Unable to open this attempt' : 'Preparing your test…'}</h1>{error && <><p role="alert">{error}</p><button className="session-primary" onClick={() => void load()}>Try again</button></>}</div></section>;
    if(state.kind==='mock'&&!state.complete){
      const m=state.mock,now=clock||Date.now()+offset.current,fmtT=(ms:number)=>{const t=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');};
      const name=(x?:string|null)=>x?x[0].toUpperCase()+x.slice(1):'';
      const shell=(eyebrow:string,title:string,body:string,timer?:{label:string;ms:number},extra?:ReactNode)=><section className="exam-session-shell launcher-shell"><div className="exam-session-sheet launcher-sheet" role="status"><header className="launcher-head"><span className="launcher-kind">{eyebrow}</span><h1>{title}</h1><p lang="bn">{body}</p></header>{timer&&<div role="timer" style={{textAlign:'center',margin:'12px 0'}}><small style={{display:'block',opacity:.7}}>{timer.label}</small><strong style={{fontSize:48,fontVariantNumeric:'tabular-nums'}}>{fmtT(timer.ms)}</strong></div>}{extra}</div></section>;
      const audioLine=state.current?.module==='listening'||state.upcoming?.module==='listening'?(audio?(audio.failed?'Audio could not load. Check your connection.':audio.ready?'✓ Audio is loaded and ready':`Loading audio… ${audio.loaded}/${audio.total}`):'Preparing audio…'):'';
      if(m&&m.moduleStart!==null&&now<m.moduleStart){
        const first=state.index===0,loading=first&&now>=m.moduleStart-15000;
        return shell(first?(loading?'Loading':'Waiting room'):'Break',first?(loading?'Loading your test…':'You are in the waiting room'):'Next module starts soon',first?'Everyone starts at the same time. Stay in full screen. Listening audio plays on its own when the timer ends.':name(state.current?.module||state.upcoming?.module||state.modules[state.index]?.module)+' starts on schedule. Please wait.',{label:first?'Test starts in':name(state.modules[state.index]?.module)+' starts in',ms:m.moduleStart-now},audioLine?<p style={{textAlign:'center'}}>{audioLine}</p>:undefined);
      }
      if(state.moduleSubmitted||(m&&m.moduleEnd!==null&&now>=m.moduleEnd&&state.current?.module!=='speaking')){
        const ended=m?.moduleEnd!=null&&now>=m.moduleEnd;
        if(!ended)return shell('Submitted',name(state.modules[state.index]?.module)+' submitted','Your answers are locked. Please wait until everyone\'s time is up.',m?.moduleEnd?{label:'Everyone finishes in',ms:m.moduleEnd-now}:undefined);
        return shell(m?.nextStart?'Break':'Finishing',m?.nextStart?'Next module starts soon':'Wrapping up…',m?.nextStart?name(m.nextModule)+' starts on schedule. Please wait.':'Submitting everything.',m?.nextStart?{label:name(m.nextModule)+' starts in',ms:m.nextStart-now}:undefined);
      }
    }
    if(state.complete&&state.kind==='mock'&&!state.resultPublished)return <section className="exam-session-shell launcher-shell"><div className="exam-session-sheet launcher-sheet"><header className="launcher-head"><span className="launcher-kind">Mock submitted</span><h1>All modules submitted</h1><p>Writing and Speaking are being evaluated on our server. You can close this page.</p></header><ul className="launcher-rules"><li>Your score and feedback appear in My tests once results are published.</li></ul><a className="launcher-start" href={back}>Back to mock</a><button type="button" className="launcher-back" style={{justifySelf:'start'}} onClick={()=>void load()}>Check result</button></div></section>;
    if(state.moduleSubmitted)return <section className="exam-session-shell"><div className="exam-session-sheet"><h1>{state.modules[state.index]?.module} submitted</h1><p>Your answers are locked. The next module opens for everyone at the scheduled time.</p><p role="timer">{Math.floor(time/60)}:{String(time%60).padStart(2,'0')} remaining until the next scheduled stage</p><button onClick={()=>void load()}>Refresh</button></div></section>;
    if (state.complete) {
        const marked = state.results.filter(r => r.total !== null), correct = marked.reduce((n, r) => n + (r.correct ?? 0), 0), total = marked.reduce((n, r) => n + (r.total ?? 0), 0);
        return <section className="exam-session-shell"><div className="exam-session-sheet results-sheet"><span className="session-eyebrow">TEST COMPLETE</span><h1>Test complete</h1><p>{state.title}</p><div className="result-total">{total>0?<strong>{correct}<small> / {total}</small></strong>:<strong className="result-submitted">Submitted</strong>}<span>{total>0?"Correct answers · Listening & Reading":"Your responses have been submitted"}</span></div><div className="result-module-grid">{state.results.map(r => <article key={r.module}><span className="session-eyebrow">{r.module}</span>{r.total === null ? <><h2>{state.kind==='mock'?(r.module==='speaking'?'Speaking band ':'Writing band ')+(r.bandScore?.toFixed(1)??'—'):'AI assessment'}</h2>{r.module==='writing'?<p>{r.wordCount??0} words</p>:<p>Recorded Speaking responses</p>}{'feedback' in r&&<p>{String(r.feedback)}</p>}</> : <><h2>{r.correct}<small> / {r.total}</small></h2><p>{r.scorePercent}% correct{r.bandScore !== null ? ' · Estimated band ' + r.bandScore.toFixed(1) : ''}</p></>}</article>)}</div>{state.kind!=='mock'&&state.results.some(r=>r.module==='writing')&&<WritingEvaluation attemptId={state.id} tasks={state.results.find(r=>r.module==='writing')!.items.map((item,index)=>({task:index+1,answer:item.answer}))}/>}{state.kind==='mock'&&state.results.find(r=>r.module==='writing')?.aiAssessment?.tasks.map(task=><article className="writing-task-feedback" key={task.task}><h3>Writing Task {task.task}</h3><TaskAssessment feedback={task}/></article>)}{state.kind==='mock'&&state.results.find(r=>r.module==='speaking')?.speakingAssessment&&<SpeakingAssessmentView result={state.results.find(r=>r.module==='speaking')!.speakingAssessment!}/>}<p>Compare your answers with the feedback below.</p>{state.results.map(r => <details className="result-review" key={r.module}><summary>Review {r.module} answers</summary><div>{r.items.map(item => <article key={item.id}><div><strong>{item.label}</strong><span className={'answer-status ' + (item.correct === true ? 'correct' : item.correct === false ? 'incorrect' : '')}>{item.correct === true ? 'Correct' : item.correct === false ? 'Check answer' : 'Unmarked'}</span></div><p><span>Your answer</span>{item.answer || 'Not answered'}</p>{item.correctAnswer !== null && <p><span>Answer key</span>{item.correctAnswer || 'Not set'}</p>}</article>)}</div></details>)}<a className="session-primary" href={back}>Back to practice ↗</a><p className="session-note">{state.kind==='mock'?'Your published mock result is saved to your account.':'This result is available in this browser for 24 hours.'}</p></div></section>;
    }
    if(state.kind==='mock'&&state.current?.module==='speaking')return <iframe title="Speaking test" src={'/speaking/evaluation/'+id} allow="microphone; fullscreen" style={{position:'fixed',inset:0,width:'100%',height:'100%',border:0,background:'#fff',zIndex:50}}/>;
    if(state.current?.module==='speaking')return <section className="exam-session-shell"><div className="exam-session-sheet"><h1>Speaking test</h1><p>Part 1 → Part 2 → Part 3. Record each answer. The schedule is the same for everyone.</p><p>There is no total time limit for Speaking. Submit when you finish.</p><a className="session-primary" href={'/speaking/evaluation/'+id}>Enter Speaking room ↗</a></div></section>;
    const waitingForListeningAudio = !state.deadline && state.current?.module === 'listening' &&
        Boolean(state.current.document.audioUrl || state.current.document.parts.some((p: any) => p.audio_url));
    if (!state.deadline && !waitingForListeningAudio)
        return <section className="exam-session-shell"><div className="exam-session-sheet" role="status"><span className="session-eyebrow">MODULE {state.index + 1} OF {state.modules.length}</span><h1>Opening {state.current?.module}…</h1><p>Your test will start automatically. There is no additional step.</p>{error && <><p role="alert">{error}</p><button className="session-primary" disabled={busy} onClick={() => void action('start').catch(() => { })}>Retry opening module</button></>}<a className="session-back" href={back}>Leave test</a></div></section>;

        if (!state.current) return <section className="exam-session-shell"><div className="exam-session-sheet" role="status"><h1>Loading…</h1><p>Your test is opening.</p>{error&&<button className="session-primary" onClick={() => void load()}>Try again</button>}</div></section>;
    const examDoc = state.kind==='mock'&&state.current!.module==='listening' ? { ...state.current!.document, audioUrl: '', parts: state.current!.document.parts.map((p: any) => ({ ...p, audio_url: '', audio_fallbacks: [] })) } : state.current!.document;
    const audioBlocked = state.kind==='mock'&&Boolean(audio?.blocked);
    return <EngineSurface nonce={nonce}><Toaster />{audioBlocked&&<button type="button" className="session-primary" style={{position:'fixed',top:12,left:'50%',transform:'translateX(-50%)',zIndex:2147483000}} onClick={()=>audioCtl.current?.resume()}>Tap to turn on the Listening audio</button>}<p role="status">{saveStatus}</p>{error && <div className="attempt-error" role="alert">{error}<button disabled={busy} onClick={() => void action('submit').catch(() => { })}>Retry submission</button></div>}<ExamInterface key={state.index} nonce={nonce} testTitle={state.title + ' · ' + (state.index + 1) + ' / ' + state.modules.length} sectionType={state.current!.module as Module} parts={examDoc.parts} questions={examDoc.questions} timeLeft={waitingForListeningAudio ? state.current!.document.durationMinutes * 60 : time} answers={answers} onAnswerChange={change} onFinish={() => action('submit')} onExit={() => { if (state.kind==='mock') return; if (confirm('Leave this test? The current module timer will keep running.'))
        window.location.assign(back); }} disablePause sectionAudioUrl={state.kind==='mock'?'':state.current!.document.audioUrl}
      waitForAudioStart={waitingForListeningAudio}
      practiceAudioPlayer={state.kind!=='mock'}
      onAudioPlaybackStarted={async () => {
        if (stateRef.current?.deadline || lock.current) return;
        await action('start');
      }}/></EngineSurface>;
}

function SpeakingAssessmentView({result:r}:{result:import('@/lib/products/speaking-provider').SpeakingAssessment}){return <section><h2>Speaking feedback</h2><p>{r.limitation}</p>{([['Fluency & Coherence',r.fluency],['Lexical Resource',r.lexicalResource],['Grammar',r.grammar],['Pronunciation',r.pronunciation]] as const).map(([label,c])=><article key={label}><h3>{label} · {c.band}</h3><p>{c.feedback}</p></article>)}<h3>Next steps</h3><ul>{r.nextSteps.map((v,i)=><li key={i}>{v}</li>)}</ul></section>;}
