'use client';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {CueCard} from '@/lib/cue-cards';
import styles from './cue-cards.module.css';
const fmt=(s:number)=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
type Phase='idle'|'prep'|'speak'|'done';
function Practice({card,onNext,onClose}:{card:CueCard;onNext:()=>void;onClose:()=>void}){
 const [phase,setPhase]=useState<Phase>('idle'),[left,setLeft]=useState(60);
 const timer=useRef<ReturnType<typeof setInterval>|null>(null);
 const stop=()=>{if(timer.current)clearInterval(timer.current);timer.current=null;};
 useEffect(()=>{setPhase('idle');setLeft(60);stop();return stop;},[card.id]);
 const run=(p:'prep'|'speak',secs:number)=>{
  stop();setPhase(p);setLeft(secs);
  timer.current=setInterval(()=>setLeft(l=>{
   if(l>1)return l-1;
   stop();if(p==='prep'){setTimeout(()=>run('speak',120),0);}else setPhase('done');return 0;
  }),1000);
 };
 return <div className={styles.practice}>
  <div className={styles.practiceTop}><span>{card.category}</span><button className={styles.link} onClick={onClose}>Close</button></div>
  <div className={styles.cue}>
   <h2>{card.title}</h2>
   <p className={styles.say}>You should say:</p>
   <ul>{card.prompts?.map(p=><li key={p}>{p}</li>)}</ul>
  </div>
  <div className={styles.timerRow}>
   <div className={`${styles.timer} ${phase==='speak'?styles.timerOn:''}`}><small>{phase==='idle'?'Ready':phase==='prep'?'Prepare':phase==='speak'?'Speak':'Time up'}</small><b>{phase==='idle'?'1:00':phase==='done'?'0:00':fmt(left)}</b></div>
   <div className={styles.timerBtns}>
    {phase==='idle'&&<button className={styles.primary} onClick={()=>run('prep',60)}>Start 1 minute preparation</button>}
    {phase==='prep'&&<button className={styles.primary} onClick={()=>run('speak',120)}>Skip to speaking</button>}
    {phase==='speak'&&<button className={styles.ghost} onClick={()=>{stop();setPhase('done');}}>Finish</button>}
    {phase==='done'&&<button className={styles.primary} onClick={()=>{setPhase('idle');setLeft(60);}}>Try again</button>}
    <button className={styles.ghost} onClick={onNext}>Another card</button>
   </div>
  </div>
  {phase==='done'&&<div className={styles.part3}><h3>Now the examiner asks (Part 3)</h3><ol>{card.part3?.map(q=><li key={q}>{q}</li>)}</ol>
   <Link href="/speaking-evaluation" className={styles.link}>Record a full practice with AI feedback</Link></div>}
 </div>;
}
export function CueApp({cards,categories}:{cards:CueCard[];categories:string[]}){
 const [cat,setCat]=useState(''),[q,setQ]=useState(''),[open,setOpen]=useState<number|null>(null),[practice,setPractice]=useState<CueCard|null>(null),[limit,setLimit]=useState(24);
 const filtered=useMemo(()=>{const n=q.trim().toLowerCase();return cards.filter(c=>(!cat||c.category===cat)&&(!n||c.title.toLowerCase().includes(n)));},[cards,cat,q]);
 useEffect(()=>setLimit(24),[cat,q]);
 const pool=filtered.filter(c=>!c.locked);
 const random=()=>{const p=pool.length?pool:cards.filter(c=>!c.locked);setPractice(p[Math.floor(Math.random()*p.length)]);window.scrollTo({top:0,behavior:'smooth'});};
 const locked=cards.filter(c=>c.locked).length;
 return <div className={styles.page}>
  <section className={styles.hero}>
   <span className={styles.eyebrow}>SPEAKING PART 2</span>
   <h1>Cue card practice, topic অনুযায়ী</h1>
   <p>IELTS-এর মতো করে সাজানো {cards.length} টা cue card। প্রতিটায় ৪টা prompt, Part 3-এর প্রশ্ন আর কাজের কিছু শব্দ। এক মিনিট ভাবো, তারপর দুই মিনিট বলো।</p>
   <div className={styles.heroBtns}><button className={styles.primary} onClick={random}>Practise a random card</button><Link href="/speaking-evaluation" className={styles.ghost}>Speaking evaluation</Link></div>
  </section>
  {practice&&<Practice card={practice} onNext={random} onClose={()=>setPractice(null)}/>}
  <div className={styles.bar}>
   <input className={styles.search} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search a topic" aria-label="Search cue cards"/>
   <select className={styles.select} value={cat} onChange={e=>setCat(e.target.value)} aria-label="Category"><option value="">All categories</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
  </div>
  <p className={styles.count}><b>{filtered.length}</b> cards{cat?` · ${cat}`:''}</p>
  <div className={styles.grid}>{filtered.slice(0,limit).map(c=>c.locked
   ?<article key={c.id} className={`${styles.card} ${styles.locked}`}><span className={styles.tag}>{c.category}</span><h3>{c.title}</h3><Link href="/pricing" className={styles.link}>Unlock with a plan</Link></article>
   :<article key={c.id} className={styles.card}><span className={styles.tag}>{c.category}</span><h3>{c.title}</h3>
    <button className={styles.link} aria-expanded={open===c.id} onClick={()=>setOpen(open===c.id?null:c.id)}>{open===c.id?'Hide card':'Show prompts and Part 3'}</button>
    {open===c.id&&<div className={styles.detail}><p className={styles.say}>You should say:</p><ul>{c.prompts?.map(p=><li key={p}>{p}</li>)}</ul>
     <p className={styles.say}>Part 3 questions</p><ol>{c.part3?.map(x=><li key={x}>{x}</li>)}</ol>
     <p className={styles.say}>Useful language</p><div className={styles.chips}>{c.ideas?.map(i=><span key={i}>{i}</span>)}</div>
     <button className={styles.primary} onClick={()=>{setPractice(c);window.scrollTo({top:0,behavior:'smooth'});}}>Practise this card</button></div>}
   </article>)}</div>
  {limit<filtered.length&&<div className={styles.more}><button className={styles.ghost} onClick={()=>setLimit(l=>l+24)}>Show more</button></div>}
  {locked>0&&<div className={styles.upsell}><div><h3>আরও {locked} টা cue card</h3><p>প্রতিটা category-র প্রথম ৩টা free। Plan নিলে বাকি সব card, Part 3 প্রশ্ন ও practice খুলে যাবে।</p></div><Link href="/pricing" className={styles.primary}>See plans</Link></div>}
 </div>;
}
