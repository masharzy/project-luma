'use client';
import Link from 'next/link';
import { useCallback,useEffect,useState } from 'react';
type Event={title:string;description:string;access:string;startsAt:string;endsAt:string;phase:string;serverNow:number;registered:boolean;attemptId:string|null;signedIn:boolean;published:boolean;modules:{module:string;minutes:number}[]};
export function MockRoom({id}:{id:string}){
 const [event,setEvent]=useState<Event|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[now,setNow]=useState(Date.now()),[offset,setOffset]=useState(0);
 const load=useCallback(async()=>{try{const r=await fetch('/api/mocks/'+id,{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error);setEvent(d);setOffset(d.serverNow-Date.now());setError('');}catch(e){setError(e instanceof Error?e.message:'Unable to load mock');}},[id]);
 useEffect(()=>{void load();const poll=setInterval(()=>void load(),15000);return()=>clearInterval(poll);},[load]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()+offset),1000);return()=>clearInterval(timer);},[offset]);
 async function action(action:string){setBusy(true);setError('');try{const r=await fetch('/api/mocks/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})}),d=await r.json();if(!r.ok)throw Error(d.error);if(d.attemptId)window.location.assign('/exam/attempt/'+d.attemptId);else await load();}catch(e){setError(e instanceof Error?e.message:'Please retry');}finally{setBusy(false);}}
 if(!event)return <section className="workspace-panel"><p role="status">{error||'Loading mock…'}</p><button className="button" onClick={()=>void load()}>Retry</button></section>;
 const start=new Date(event.startsAt).getTime(),end=new Date(event.endsAt).getTime(),phase=now<start?'waiting':now<end?'live':'ended',left=Math.max(0,Math.ceil((start-now)/1000));
 return <section className="workspace-panel"><span className="eyebrow">{phase==='waiting'?'WAITING ROOM':phase==='live'?'MOCK IN PROGRESS':'MOCK COMPLETE'}</span><h1>{event.title}</h1><p>{event.description}</p><p>{new Date(event.startsAt).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})} · Bangladesh time</p><p>{event.modules.map(m=>m.module+' '+m.minutes+' min').join(' → ')}</p>
 {phase==='waiting'&&<p role="timer">Starts in {Math.floor(left/3600)}h {Math.floor(left/60)%60}m {left%60}s</p>}
 <p lang="bn">রেজিস্টার করলে শুরুর প্রায় ১০ মিনিট আগে ইমেইল রিমাইন্ডার পাবে। সবাই একই সময়সূচিতে পরীক্ষা দেবে। দেরিতে ঢুকলে বাড়তি সময় পাবে না। উত্তর নিয়মিত সংরক্ষণ হবে; module submit করলে আর বদলাতে পারবে না।</p>
 {!event.signedIn?<Link className="button" href={'/auth/sign-in?next='+encodeURIComponent('/mocks/'+id)}>Log in to register ↗</Link>:!event.registered?phase==='waiting'?<button className="button" disabled={busy} onClick={()=>void action('register')}>Register{event.access==='premium'?' · Premium':''} ↗</button>:<p>Registration has closed.</p>:phase==='waiting'?<p role="status">Registered · এই পেজেই শুরুর সময় Join test বাটন আসবে।</p>:phase==='live'?<button className="button" disabled={busy} onClick={()=>void action('join')}>{busy?'Opening…':event.attemptId?'Resume test ↗':'Join test ↗'}</button>:event.attemptId?<Link className="button" href={'/exam/attempt/'+event.attemptId}>{event.published?'View result ↗':'View submission status ↗'}</Link>:<p>You did not join this mock.</p>}
 {phase==='ended'&&!event.published&&<p>Admin result publish করলে এখানে ফল দেখতে পাবে।</p>}{error&&<p role="alert">{error}</p>}</section>;
}
