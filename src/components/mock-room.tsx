'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import { useCallback,useEffect,useState } from 'react';
import { Headphones,BookOpenText,PenLine,Mic,CalendarDays,Clock3,Check,ArrowUpRight,Lock } from 'lucide-react';
import { mockFull,mockTime } from '@/lib/mock-phase';
type Event={title:string;description:string;access:string;startsAt:string;endsAt:string;phase:string;serverNow:number;registered:boolean;attemptId:string|null;signedIn:boolean;published:boolean;modules:{module:string;minutes:number}[]};
export function MockRoom({id}:{id:string}){
 const router=useRouter();
 const [event,setEvent]=useState<Event|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[now,setNow]=useState(Date.now()),[offset,setOffset]=useState(0);
 const load=useCallback(async()=>{try{const r=await fetch('/api/mocks/'+id,{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error);setEvent(d);setOffset(d.serverNow-Date.now());setError('');}catch(e){setError(e instanceof Error?e.message:'Unable to load mock');}},[id]);
 useEffect(()=>{void load();const poll=setInterval(()=>void load(),15000);return()=>clearInterval(poll);},[load]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()+offset),1000);return()=>clearInterval(timer);},[offset]);
 async function action(action:string){setBusy(true);setError('');try{const r=await fetch('/api/mocks/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})}),d=await r.json();if(!r.ok)throw Error(d.error);if(d.attemptId)window.location.assign('/exam/attempt/'+d.attemptId);else {await load();router.refresh();}}catch(e){setError(e instanceof Error?e.message:'Please retry');}finally{setBusy(false);}}
 if(!event)return <section className="mkr-loading" role="status"><p>{error||'Loading mock…'}</p><button type="button" className="lib-btn" onClick={()=>void load()}>Retry</button></section>;
 const hasSpeaking=event.modules.some(m=>m.module==='speaking');
 const start=new Date(event.startsAt).getTime(),end=new Date(event.endsAt).getTime(),phase=now<start?'waiting':now<end?'live':'ended',left=Math.max(0,Math.ceil((start-now)/1000));
 const d=Math.floor(left/86400),h=Math.floor(left/3600)%24,m=Math.floor(left/60)%60,sec=left%60;
 const icons={listening:Headphones,reading:BookOpenText,writing:PenLine,speaking:Mic} as const;
 const label=phase==='waiting'?'Waiting room':phase==='live'||(hasSpeaking&&!event.published)?'Mock in progress':'Mock complete';
 const registeredLine=!event.signedIn?'Log in to register':event.registered?'Registered':phase==='waiting'?'Not registered yet':'Registration closed';
 const cta=!event.signedIn?<Link className="lib-btn mkr-cta" href={'/auth/sign-in?next='+encodeURIComponent('/mocks/'+id)}>Log in to register <ArrowUpRight size={17}/></Link>
  :!event.registered?phase==='waiting'?<button type="button" className="lib-btn mkr-cta" disabled={busy} onClick={()=>void action('register')}>Register{event.access==='premium'?' · Premium':''} <ArrowUpRight size={17}/></button>:<p className="mkr-note">Registration has closed.</p>
  :phase==='waiting'?<p className="mkr-note" role="status" lang="bn">Registered · এই পেজেই শুরুর সময় Join test বাটন আসবে।</p>
  :phase==='live'?<button type="button" className="lib-btn mkr-cta" disabled={busy} onClick={()=>void action('join')}>{busy?'Opening…':event.attemptId?'Resume test':'Join test'} <ArrowUpRight size={17}/></button>
  :event.attemptId?<Link className="lib-btn mkr-cta" href={'/exam/attempt/'+event.attemptId}>{event.published?'View result':hasSpeaking?'Continue test / Speaking':'Open test'} <ArrowUpRight size={17}/></Link>
  :!event.published&&hasSpeaking?<button type="button" className="lib-btn mkr-cta" disabled={busy} onClick={()=>void action('join')}>Continue to Speaking <ArrowUpRight size={17}/></button>
  :<p className="mkr-note">You did not join this mock.</p>;
 return <section className={'mkr mkr-'+phase}>
  <div className="mkr-main">
   <span className={'mk-phase mk-phase-'+(phase==='waiting'?'upcoming':phase==='live'?'live':'completed')}>{phase==='live'&&<i aria-hidden/>}{label}</span>
   <h1>{event.title}</h1>
   {event.description&&<p className="mkr-desc" lang="bn">{event.description}</p>}
   <dl className="mkr-facts">
    <div><dt><CalendarDays size={14} aria-hidden/>Schedule</dt><dd>{mockFull(event.startsAt)}<small>– {mockTime(event.endsAt)} · Bangladesh time</small></dd></div>
    <div><dt><Check size={14} aria-hidden/>Registration</dt><dd>{registeredLine}</dd></div>
    <div><dt>{event.access==='premium'?<Lock size={14} aria-hidden/>:<Clock3 size={14} aria-hidden/>}Access</dt><dd>{event.access==='premium'?'Premium':'Free'}</dd></div>
   </dl>
   <h2 className="mkr-h2">Modules</h2>
   <ol className="mkr-modules">{event.modules.map((mod,i)=>{const I=icons[mod.module as keyof typeof icons]??BookOpenText;return <li key={mod.module}><span className="mkr-mod-no">{String(i+1).padStart(2,"0")}</span><I size={18} aria-hidden/><strong>{mod.module[0].toUpperCase()+mod.module.slice(1)}</strong><small>{mod.module==='speaking'?'No total time limit':mod.minutes+' min'}</small></li>})}</ol>
   <p className="mkr-rules" lang="bn">রেজিস্টার করলে শুরুর প্রায় ১০ মিনিট আগে ইমেইল রিমাইন্ডার পাবে। সবাই একই সময়সূচিতে পরীক্ষা দেবে। দেরিতে ঢুকলে বাড়তি সময় পাবে না। উত্তর নিয়মিত সংরক্ষণ হবে; module submit করলে আর বদলাতে পারবে না।</p>
  </div>
  <aside className="mkr-panel" aria-label="Your mock status">
   {phase==='waiting'&&<div className="mkr-count" role="timer" aria-label={`Starts in ${d} days ${h} hours ${m} minutes ${sec} seconds`}><span className="mkr-count-label">Starts in</span><div>{([[d,'days'],[h,'hrs'],[m,'min'],[sec,'sec']] as const).map(([v,u])=><span key={u}><b>{String(v).padStart(2,'0')}</b>{u}</span>)}</div></div>}
   {phase==='live'&&<div className="mkr-count"><span className="mkr-count-label">Live now</span><p>Exam window closes at {mockTime(event.endsAt)}</p></div>}
   {phase==='ended'&&<div className="mkr-count"><span className="mkr-count-label">Finished</span><p>{event.published?'Results are published.':'Result publish হলে এখানে দেখবে।'}</p></div>}
   {cta}
   {phase==='ended'&&!event.published&&<p className="mkr-note" lang="bn">Admin result publish করলে এখানে ফল দেখতে পাবে।</p>}
   {error&&<p role="alert" className="mkr-error">{error}</p>}
  </aside>
 </section>;
}
