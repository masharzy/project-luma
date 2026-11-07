'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import type {Sample} from '@/lib/writing-samples';
import {Chart} from './charts';
import styles from '@/components/cue-cards/cue-cards.module.css';
import ws from './writing.module.css';
const KEY='jtn.writing.done';
const TYPE_LABEL:Record<string,string>={line:'Line graph',bar:'Bar chart',pie:'Pie chart',table:'Table',process:'Process'};
const label=(s:Sample)=>s.task===1?TYPE_LABEL[s.type]||s.type:s.type;
const kind=(s:Sample)=>`${s.task===1?'t1':'t2'}-${s.id}`;
function Lock(){return <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden><rect x="4" y="9" width="12" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M7 9V6.5a3 3 0 016 0V9" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>;}
function Arrow(){return <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden><path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;}
const words=(t:string)=>t.trim().split(/\s+/).length;
function Detail({s,list,go,back,done,toggle}:{s:Sample;list:Sample[];go:(x:Sample)=>void;back:()=>void;done:boolean;toggle:()=>void}){
 const [lv,setLv]=useState<'band7'|'band8'>('band8');
 useEffect(()=>{setLv('band8');window.scrollTo({top:0});},[s.task,s.id]);
 const i=list.findIndex(x=>x.id===s.id),prev=list[i-1],next=list[i+1];
 if(s.locked)return <div className={styles.lockPanel}><Lock/><h2>{s.title}</h2><p>এই sample-এর Band 7 ও Band 8 উত্তর, examiner comment আর useful language plan-এর সাথে খোলে। প্রতিটা Task-এর প্রথম ৪টা free।</p><div className={styles.row}><Link href="/pricing" className={styles.primary}>See plans</Link><button className={styles.ghost} onClick={back}>Back to list</button></div></div>;
 const a=s[lv]!;
 return <div>
  <header className={styles.topicHead}>
   <span className={styles.tag}>Task {s.task} · {label(s)}{s.topic?` · ${s.topic}`:''}</span>
   <h1>{s.title}</h1>
   {s.instruction&&<p className={ws.instr}>{s.instruction}</p>}
  </header>
  {s.task===1&&<div className={ws.chartBox}><Chart type={s.type} data={s.data} unit={s.unit}/></div>}
  <div className={ws.cols}>
   <aside className={ws.side}>
    <div className={styles.meta}><span className={styles.label}>{s.task===1?'What to select':'Plan'}</span><ul>{(s.task===1?s.keyFeatures:s.outline)?.map(x=><li key={x}>{x}</li>)}</ul></div>
    {s.overview&&<div className={styles.meta}><span className={styles.label}>Overview example</span><p className={ws.small}>{s.overview}</p></div>}
    {s.structure&&<div className={styles.meta}><span className={styles.label}>Band 8 structure</span><ol className={ws.struct}>{s.structure.map(x=><li key={x.para}><b>{x.para}</b> {x.note}</li>)}</ol></div>}
   </aside>
   <div>
    <div className={styles.modeRow}><div className={styles.seg}><button className={lv==='band7'?styles.segOn:''} onClick={()=>setLv('band7')}>Band 7</button><button className={lv==='band8'?styles.segOn:''} onClick={()=>setLv('band8')}>Band 8-9</button></div><small>{words(a.text)} words</small></div>
    <article className={ws.essay}>{a.text.split(/\n+/).map((p,k)=><p key={k}>{p}</p>)}</article>
    <div className={ws.comment}><span className={styles.label}>Examiner comment</span><p>{a.comment}</p></div>
    <h3 className={ws.h3}>Useful language</h3>
    <div className={styles.phraseGrid}>{s.language?.map(x=><div key={x.p} className={styles.phrase}><b>{x.p}</b><span>{x.m}</span></div>)}</div>
   </div>
  </div>
  <footer className={styles.topicFoot}>
   <button className={done?styles.doneOn:styles.doneBtn} onClick={toggle}>{done?'Marked as read':'Mark as read'}</button>
   <div className={styles.row}>{prev&&<button className={styles.ghost} onClick={()=>go(prev)}>Previous</button>}{next&&<button className={styles.primary} onClick={()=>go(next)}>Next sample</button>}</div>
  </footer>
 </div>;
}
export function WritingApp({samples}:{samples:Sample[]}){
 const [route,setRoute]=useState({task:1 as 1|2,id:0}),[type,setType]=useState(''),[done,setDone]=useState<string[]>([]);
 const parse=useCallback(()=>{const m=location.hash.match(/^#t([12])(?:\/(\d+))?/);setRoute({task:m?(Number(m[1]) as 1|2):1,id:m?Number(m[2])||0:0});},[]);
 useEffect(()=>{parse();addEventListener('hashchange',parse);try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(v))setDone(v);}catch{}return()=>removeEventListener('hashchange',parse);},[parse]);
 const nav=(task:1|2,id=0)=>{location.hash=`t${task}${id?'/'+id:''}`;window.scrollTo({top:0});};
 const toggle=(k:string)=>setDone(d=>{const n=d.includes(k)?d.filter(x=>x!==k):[...d,k];try{localStorage.setItem(KEY,JSON.stringify(n));}catch{}return n;});
 const all=useMemo(()=>samples.filter(s=>s.task===route.task),[samples,route.task]);
 const types=useMemo(()=>[...new Set(all.map(label))],[all]);
 const shown=type?all.filter(s=>label(s)===type):all;
 const current=route.id?all.find(s=>s.id===route.id):undefined;
 const free=samples.filter(s=>!s.locked).length;
 if(current)return <div className={styles.page}>
  <nav className={styles.crumbs}><button onClick={()=>nav(route.task)}>Writing samples</button><span>/</span><button onClick={()=>nav(route.task)}>Task {route.task}</button></nav>
  <Detail s={current} list={all} go={x=>nav(x.task,x.id)} back={()=>nav(route.task)} done={done.includes(kind(current))} toggle={()=>toggle(kind(current))}/>
 </div>;
 return <div className={styles.page}>
  <section className={styles.hero}>
   <span className={styles.eyebrow}>WRITING TASK 1 AND TASK 2</span>
   <h1>Writing samples, <em>Band 7 and Band 8</em> side by side</h1>
   <p>প্রতিটা prompt-এ দুই level-এর model answer, examiner comment, structure আর কাজের language আছে। দুটো পাশাপাশি পড়লেই বোঝা যায় Band 7 থেকে Band 8-এ উঠতে কী বদলাতে হয়।</p>
   <ul className={styles.stats}><li><b>{samples.filter(s=>s.task===1).length}</b>Task 1 charts</li><li><b>{samples.filter(s=>s.task===2).length}</b>Task 2 essays</li><li><b>{free}</b>free samples</li><li><b>{done.length}</b>read by you</li></ul>
  </section>
  <div className={ws.taskTabs}>{([1,2] as const).map(t=><button key={t} className={route.task===t?ws.taskOn:''} onClick={()=>{setType('');nav(t);}}>Task {t}<small>{t===1?'Charts, tables, processes':'Essays'}</small></button>)}</div>
  <div className={ws.chips}><button className={!type?ws.chipOn:''} onClick={()=>setType('')}>All</button>{types.map(t=><button key={t} className={type===t?ws.chipOn:''} onClick={()=>setType(t)}>{t}</button>)}</div>
  <p className={styles.count}><b>{shown.length}</b> samples</p>
  <div className={styles.list}>{shown.map((s,k)=><button key={s.id} className={`${styles.rowItem} ${s.locked?styles.rowLocked:''}`} onClick={()=>nav(s.task,s.id)}>
   <span className={`${styles.num} ${done.includes(kind(s))?styles.numDone:''}`}>{s.id}</span>
   <span className={styles.rowTitle}>{s.title}<small className={ws.sub}>{label(s)}{s.topic?` · ${s.topic}`:''}</small></span>
   <span className={styles.rowIcon}>{s.locked?<Lock/>:<Arrow/>}</span></button>)}</div>
  {all.some(s=>s.locked)&&<div className={styles.upsell}><div><h3>আরও {all.filter(s=>s.locked).length}টা Task {route.task} sample</h3><p>প্রতিটা Task-এর প্রথম ৪টা free। Plan নিলে বাকি সব Band 7 ও Band 8 উত্তর খুলে যাবে।</p></div><Link href="/pricing" className={styles.primary}>See plans</Link></div>}
 </div>;
}
