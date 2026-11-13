'use client';
import Link from 'next/link';
import { useCallback,useEffect,useRef,useState } from 'react';
import { Headphones,BookOpenText,PenLine,Mic,CalendarDays,Clock3,Check,ArrowUpRight,Lock } from 'lucide-react';
import { mockFull,mockTime } from '@/lib/mock-phase';
import { lobbyStage,joinClosesAt } from '@/lib/exam/mock-schedule';
import { unlockAudio } from '@/lib/exam/mock-audio';
import { enterFullscreen } from './exam/exam-lock';
import { AttemptRunner } from './exam/attempt-runner';
import { MockPreflight } from './mock-preflight';
import '@/styles/exam-session.css';
type Event={title:string;description:string;access:string;startsAt:string;endsAt:string;serverNow:number;registered:boolean;attemptId:string|null;signedIn:boolean;published:boolean;modules:{module:string;minutes:number}[]};
const clock=(ms:number)=>{const t=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');};
export function MockRoom({id,nonce}:{id:string;nonce?:string}){
 const [event,setEvent]=useState<Event|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[now,setNow]=useState(Date.now());
 const offset=useRef(0),bestRtt=useRef(Infinity);
 // Server clock: the offset from the fastest round trip so far (smallest uncertainty), refreshed every few seconds.
 const load=useCallback(async()=>{try{const t0=Date.now(),r=await fetch('/api/mocks/'+id,{cache:'no-store'}),t1=Date.now(),d=await r.json();if(!r.ok)throw Error(d.error);const rtt=t1-t0;if(rtt<=bestRtt.current*1.5+20){bestRtt.current=Math.min(bestRtt.current,rtt);offset.current=d.serverNow-(t0+t1)/2;}setEvent(d);setError('');}catch(e){setError(e instanceof Error?e.message:'Unable to load mock');}},[id]);
 useEffect(()=>{void load();const poll=setInterval(()=>void load(),8000);return()=>clearInterval(poll);},[load]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()+offset.current),250);return()=>clearInterval(timer);},[]);
 async function action(action:string){
  // Full screen and audio can only be unlocked inside this click, before any await.
  if(action==='join'){unlockAudio();void enterFullscreen();}
  setBusy(true);setError('');
  try{const r=await fetch('/api/mocks/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})}),d=await r.json();if(!r.ok)throw Error(d.error);await load();}
  catch(e){setError(e instanceof Error?e.message:'Please retry');if(action==='join'&&document.fullscreenElement)void document.exitFullscreen().catch(()=>{});}
  finally{setBusy(false);}
 }
 if(!event)return <section className="mkr-loading" role="status"><p>{error||'Loading mock…'}</p><button type="button" className="lib-btn" onClick={()=>void load()}>Retry</button></section>;
 const start=new Date(event.startsAt).getTime(),end=new Date(event.endsAt).getTime();
 // Someone who joined is inside the exam for good: waiting room, loading, papers, breaks, finish, results. One page, one full-screen session.
 if(event.attemptId&&now>=start-1000)return <AttemptRunner id={event.attemptId} nonce={nonce}/>;
 const stage=lobbyStage(start,end,now),hasSpeaking=event.modules.some(m=>m.module==='speaking'),closes=joinClosesAt(start);
 const icons={listening:Headphones,reading:BookOpenText,writing:PenLine,speaking:Mic} as const;
 const label=stage==='wait'||stage==='countdown'?'Waiting room':stage==='join'?'Waiting room open':stage==='ended'?'Mock complete':'Mock in progress';
 const registeredLine=!event.signedIn?'Log in to register':event.registered?'Registered':stage==='wait'||stage==='countdown'||stage==='join'?'Not registered yet':'Registration closed';
 const login=<Link className="lib-btn mkr-cta" href={'/auth/sign-in?next='+encodeURIComponent('/mocks/'+id)}>Log in to register <ArrowUpRight size={17}/></Link>;
 const register=<button type="button" className="lib-btn mkr-cta" disabled={busy} onClick={()=>void action('register')}>Register{event.access==='premium'?' · Premium':''} <ArrowUpRight size={17}/></button>;
 // No Join button exists before the timer ends, and none after the join window closes; the server enforces the same window.
 const panel=stage==='wait'?<div className="mkr-count"><span className="mkr-count-label">{event.registered?'You are registered':'Registration open'}</span><p>{event.registered?'Wait on this page. The countdown starts 10 minutes before the exam.':'Register now. The countdown starts on this page 10 minutes before the exam.'}</p></div>
  :stage==='countdown'?<div className="mkr-count" role="timer"><span className="mkr-count-label">Waiting room opens in</span><div><span><b>{clock(start-now)}</b>min : sec</span></div>{event.registered&&<p>The Join now button appears here when the timer ends.</p>}</div>
  :stage==='join'?<div className="mkr-count" role="timer"><span className="mkr-count-label">{event.registered?'Join within':'Registration closed'}</span>{event.registered&&<><div><span><b>{clock(closes-now)}</b>min : sec</span></div><p>Join within this time. Joining opens full screen, and the exam starts for everyone together.</p></>}</div>
  :stage==='ended'?<div className="mkr-count"><span className="mkr-count-label">Finished</span><p>{event.published?'Results are published.':'Results are not published yet.'}</p></div>
  :<div className="mkr-count"><span className="mkr-count-label">Join window closed</span><p>This mock is already running and can no longer be joined.</p></div>;
 const cta=!event.signedIn?(stage==='wait'||stage==='countdown'||stage==='join'?login:null)
  :!event.registered?(stage==='wait'||stage==='countdown'?register:null)
  :stage==='join'?<button type="button" className="lib-btn mkr-cta" disabled={busy} onClick={()=>void action('join')}>{busy?'Joining…':'Join now'} <ArrowUpRight size={17}/></button>:null;
 return <section className={'mkr mkr-'+(stage==='live'||stage==='loading'?'live':stage==='ended'?'ended':'waiting')}>
  <div className="mkr-main">
   <span className={'mk-phase mk-phase-'+(stage==='ended'?'completed':stage==='live'||stage==='loading'?'live':'upcoming')}>{(stage==='live'||stage==='loading')&&<i aria-hidden/>}{label}</span>
   <h1>{event.title}</h1>
   {event.description&&<p className="mkr-desc" lang="bn">{event.description}</p>}
   <dl className="mkr-facts">
    <div><dt><CalendarDays size={14} aria-hidden/>Schedule</dt><dd>{mockFull(event.startsAt)}<small>– {mockTime(event.endsAt)} · Bangladesh time</small></dd></div>
    <div><dt><Check size={14} aria-hidden/>Registration</dt><dd>{registeredLine}</dd></div>
    <div><dt>{event.access==='premium'?<Lock size={14} aria-hidden/>:<Clock3 size={14} aria-hidden/>}Access</dt><dd>{event.access==='premium'?'Premium':'Free'}</dd></div>
   </dl>
   <h2 className="mkr-h2">Modules</h2>
   <ol className="mkr-modules">{event.modules.map((mod,i)=>{const I=icons[mod.module as keyof typeof icons]??BookOpenText;return <li key={mod.module}><span className="mkr-mod-no">{String(i+1).padStart(2,"0")}</span><I size={18} aria-hidden/><strong>{mod.module[0].toUpperCase()+mod.module.slice(1)}</strong><small>{mod.minutes+' min'}</small></li>})}</ol>
  </div>
  <aside className="mkr-panel" aria-label="Your mock status">
   {panel}
   {event.registered&&(stage==='wait'||stage==='countdown'||stage==='join')&&<MockPreflight hasListening={event.modules.some(m=>m.module==='listening')} hasSpeaking={hasSpeaking} online={!error}/>}
   {cta}
   {error&&<p role="alert" className="mkr-error">{error}</p>}
  </aside>
 </section>;
}
