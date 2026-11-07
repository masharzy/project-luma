'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
// Leitner boxes: 1 learning ... 5 strong. Box >= 4 counts as mastered. Stored in the browser; signed-in learners also sync to the server.
export type Rec={b:number;s:number;d:number;u:number};
type Store={recs:Record<string,Rec>;days:string[];today:{date:string;n:number}};
const KEY='jtn.vocab.v1';
const DAYS=[0,0,1,3,7,21];
const dayKey=(t=Date.now())=>{const d=new Date(t);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const blank=():Store=>({recs:{},days:[],today:{date:dayKey(),n:0}});
function load():Store{try{const s=JSON.parse(localStorage.getItem(KEY)||'');return s&&s.recs?{...blank(),...s}:blank();}catch{return blank();}}
export type Status='new'|'learning'|'mastered';
export function statusOf(r?:Rec):Status{return !r||r.b<=0?'new':r.b>=4?'mastered':'learning';}
export function streakOf(days:string[]){
 const set=new Set(days);let n=0;const t=new Date();
 if(!set.has(dayKey(t.getTime())))t.setDate(t.getDate()-1);
 while(set.has(dayKey(t.getTime()))){n++;t.setDate(t.getDate()-1);}
 return n;
}
export function useProgress(authed:boolean){
 const [store,setStore]=useState<Store>(blank);
 const [ready,setReady]=useState(false);
 const [server,setServer]=useState<{goal:number;todayN:number;streakBase:number}|null>(null);
 const [session,setSession]=useState(0);
 const [goalLocal,setGoalLocal]=useState(10);
 const pending=useRef<Map<number,Rec>>(new Map());
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const flush=useCallback(()=>{
  if(!authed||!pending.current.size)return;
  const items=[...pending.current.entries()].map(([id,r])=>({id,b:r.b,s:r.s,d:r.d}));pending.current.clear();
  void fetch('/api/vocabulary/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})}).catch(()=>{});
 },[authed]);
 useEffect(()=>{
  const local=load();setStore(local);setReady(true);try{setGoalLocal(Number(localStorage.getItem(KEY+'.goal'))||10);}catch{}
  if(!authed)return;
  void fetch('/api/vocabulary/progress',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{
   if(!d)return;
   setServer({goal:d.goal,todayN:d.todayN,streakBase:d.streakBase});
   const merged={...local.recs};const up:{id:number;b:number;s:number;d:number}[]=[];
   for(const x of d.items as {id:number;b:number;s:number;d:number;u:number}[]){const mine=merged[x.id];if(!mine||x.u>mine.u)merged[x.id]={b:x.b,s:x.s,d:x.d,u:x.u};}
   for(const [id,r] of Object.entries(local.recs)){const srv=(d.items as {id:number;u:number}[]).find(x=>x.id===Number(id));if(!srv||r.u>srv.u)up.push({id:Number(id),b:r.b,s:r.s,d:r.d});}
   const next={...local,recs:merged};setStore(next);try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}
   if(up.length)void fetch('/api/vocabulary/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:up.slice(0,200),sync:true})}).catch(()=>{});
  }).catch(()=>{});
  const onHide=()=>flush();window.addEventListener('pagehide',onHide);return()=>window.removeEventListener('pagehide',onHide);
 },[authed,flush]);
 const commit=useCallback((fn:(s:Store)=>Store)=>{setStore(prev=>{const next=fn(prev);try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}return next;});},[]);
 const touch=useCallback((s:Store,study:boolean):Store=>{
  const t=dayKey();const today=s.today.date===t?s.today:{date:t,n:0};
  return study?{...s,days:s.days.includes(t)?s.days:[...s.days.slice(-400),t],today:{date:t,n:today.n+1}}:{...s,today};
 },[]);
 const queue=useCallback((id:number,r:Rec)=>{pending.current.set(id,r);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(flush,1200);},[flush]);
 // good = knew it, otherwise back to box 1.
 const review=useCallback((id:number,good:boolean)=>{
  commit(s=>{
   const old=s.recs[id];const b0=old?.b??0;const b=good?Math.min(5,Math.max(b0,1)+1):1;
   const now=Date.now();const rec:Rec={b,s:(old?.s??0)+1,d:b===1?now+10*60e3:now+DAYS[b]*864e5,u:now};
   queue(id,rec);return touch({...s,recs:{...s.recs,[id]:rec}},true);
  });
  setSession(n=>n+1);
 },[commit,queue,touch]);
 // Manual toggle from the word list.
 const setKnown=useCallback((id:number,known:boolean)=>{
  commit(s=>{
   const now=Date.now();const old=s.recs[id];const rec:Rec={b:known?4:0,s:old?.s??0,d:known?now+7*864e5:now,u:now};
   queue(id,rec);return {...s,recs:{...s.recs,[id]:rec}};
  });
 },[commit,queue]);
 const localToday=store.today.date===dayKey()?store.today.n:0;
 const todayN=authed&&server?server.todayN+session:localToday;
 const streak=authed&&server?server.streakBase+(todayN>0?1:0):streakOf(store.days);
 const goal=authed&&server?server.goal:goalLocal;
 const setGoal=useCallback((g:number)=>{
  const v=Math.max(1,Math.min(200,Math.round(g)));
  setGoalLocal(v);try{localStorage.setItem(KEY+'.goal',String(v));}catch{}
  if(authed){setServer(s=>s&&{...s,goal:v});void fetch('/api/vocabulary/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dailyGoal:v})}).catch(()=>{});}
 },[authed]);
 return{recs:store.recs,ready,review,setKnown,streak,todayN,goal,setGoal};
}
