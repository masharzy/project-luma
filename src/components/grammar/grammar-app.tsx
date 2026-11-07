'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import type {GCat,GTest,Q} from '@/lib/grammar';
import styles from '@/components/cue-cards/cue-cards.module.css';
import gs from '@/components/resources.module.css';
const KEY='jtn.grammar.v1';
type Scores=Record<string,number>;
function Lock(){return <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden><rect x="4" y="9" width="12" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M7 9V6.5a3 3 0 016 0V9" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>;}
function Arrow(){return <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden><path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;}
const L=['A','B','C','D'];
function Runner({cat,test,idx,best,onSave,onExit,onNext}:{cat:GCat;test:GTest;idx:number;best:number;onSave:(n:number)=>void;onExit:()=>void;onNext?:()=>void}){
 const qs=test.questions as Q[];
 const [i,setI]=useState(0),[pick,setPick]=useState<number|null>(null),[score,setScore]=useState(0),[wrong,setWrong]=useState<number[]>([]),[fin,setFin]=useState(false);
 useEffect(()=>{setI(0);setPick(null);setScore(0);setWrong([]);setFin(false);window.scrollTo({top:0});},[cat.slug,idx]);
 const q=qs[i];
 const choose=(k:number)=>{if(pick!==null)return;setPick(k);if(k===q.answer)setScore(s=>s+1);else setWrong(w=>[...w,i]);};
 const next=()=>{if(i+1>=qs.length){setFin(true);onSave(score);}else{setI(i+1);setPick(null);}};
 if(fin)return <div className={gs.result}>
  <span className={styles.eyebrow}>{cat.title} · {test.name}</span>
  <div className={gs.scoreRing}><b>{score}</b><small>out of {qs.length}</small></div>
  <p>{score>=qs.length*.8?'Strong result. Try the next level.':score>=qs.length*.5?'Good start. Review the explanations below and retry.':'Read the rules again, then retry this test.'}</p>
  {wrong.length>0&&<div className={gs.review}><h3>Review your mistakes</h3>{wrong.map(w=><div key={w} className={gs.revItem}><p><b>{qs[w].q}</b></p><p className={gs.good}>Correct: {qs[w].options[qs[w].answer]}</p><p>{qs[w].why}</p></div>)}</div>}
  <div className={styles.row}><button className={styles.primary} onClick={()=>{setI(0);setPick(null);setScore(0);setWrong([]);setFin(false);}}>Retry test</button>{onNext&&<button className={styles.ghost} onClick={onNext}>Next test</button>}<button className={styles.ghost} onClick={onExit}>Back to {cat.title}</button></div>
 </div>;
 return <div className={gs.runner}>
  <div className={gs.runTop}><span>{cat.title} · {test.name}</span><b>{i+1} / {qs.length}</b></div>
  <div className={styles.bar}><i style={{width:`${(i+(pick!==null?1:0))/qs.length*100}%`}}/></div>
  <h2 className={gs.q}>{q.q}</h2>
  <div className={gs.opts}>{q.options.map((o,k)=><button key={k} disabled={pick!==null} onClick={()=>choose(k)} className={`${gs.opt} ${pick!==null&&k===q.answer?gs.optOk:''} ${pick===k&&k!==q.answer?gs.optBad:''}`}><span>{L[k]}</span>{o}</button>)}</div>
  {pick!==null&&<div className={`${gs.why} ${pick===q.answer?gs.whyOk:gs.whyBad}`}><b>{pick===q.answer?'Correct.':'Not quite.'}</b> {q.why}</div>}
  <div className={styles.row}>{pick!==null&&<button className={styles.primary} onClick={next}>{i+1>=qs.length?'See result':'Next question'}</button>}<button className={styles.ghost} onClick={onExit}>Exit</button>{best>0&&<small className={gs.best}>Best: {best}/{qs.length}</small>}</div>
 </div>;
}
export function GrammarApp({cats}:{cats:GCat[]}){
 const [route,setRoute]=useState({slug:'',test:-1}),[scores,setScores]=useState<Scores>({}),[q,setQ]=useState('');
 const parse=useCallback(()=>{const [s,t]=decodeURIComponent(location.hash.slice(1)).split('/');const ok=cats.some(c=>c.slug===s);setRoute({slug:ok?s:'',test:ok&&t!==undefined?Number(t):-1});},[cats]);
 useEffect(()=>{parse();addEventListener('hashchange',parse);try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');if(v&&typeof v==='object')setScores(v);}catch{}return()=>removeEventListener('hashchange',parse);},[parse]);
 const nav=(slug='',test=-1)=>{location.hash=slug?`${slug}${test>=0?'/'+test:''}`:'';if(!slug)history.replaceState(null,'',location.pathname);parse();window.scrollTo({top:0});};
 const save=(k:string,n:number)=>setScores(s=>{const v={...s,[k]:Math.max(s[k]||0,n)};try{localStorage.setItem(KEY,JSON.stringify(v));}catch{}return v;});
 const cat=cats.find(c=>c.slug===route.slug);
 const doneTests=useMemo(()=>cats.reduce((t,c)=>t+c.tests.filter((_,i)=>(scores[`${c.slug}:${i}`]||0)>0).length,0),[cats,scores]);
 const free=cats.reduce((t,c)=>t+c.tests.filter(x=>!x.locked).length,0),total=cats.reduce((t,c)=>t+c.tests.length,0);
 const found=useMemo(()=>{const n=q.trim().toLowerCase();return n?cats.filter(c=>c.title.toLowerCase().includes(n)||c.summary.toLowerCase().includes(n)):cats;},[cats,q]);

 if(cat&&route.test>=0&&cat.tests[route.test]){
  const t=cat.tests[route.test],i=route.test;
  if(t.locked)return <div className={styles.page}><div className={styles.lockPanel}><Lock/><h2>{cat.title}: {t.name}</h2><p>এই test plan-এর সাথে খোলে। প্রতিটা category-র Foundation test free।</p><div className={styles.row}><Link href="/pricing" className={styles.primary}>See plans</Link><button className={styles.ghost} onClick={()=>nav(cat.slug)}>Back</button></div></div></div>;
  return <div className={styles.page}><nav className={styles.crumbs}><button onClick={()=>nav()}>Grammar</button><span>/</span><button onClick={()=>nav(cat.slug)}>{cat.title}</button></nav>
   <Runner cat={cat} test={t} idx={i} best={scores[`${cat.slug}:${i}`]||0} onSave={n=>save(`${cat.slug}:${i}`,n)} onExit={()=>nav(cat.slug)} onNext={cat.tests[i+1]?()=>nav(cat.slug,i+1):undefined}/></div>;
 }
 if(cat)return <div className={styles.page}>
  <nav className={styles.crumbs}><button onClick={()=>nav()}>Grammar</button><span>/</span><b>{cat.title}</b></nav>
  <div className={styles.catHead}><div><span className={styles.eyebrow}>GRAMMAR</span><h1>{cat.title}</h1><p>{cat.summary}</p></div></div>
  <h2 className={gs.h2}>Practice tests</h2>
  <div className={gs.testGrid}>{cat.tests.map((t,i)=>{const b=scores[`${cat.slug}:${i}`]||0;return <button key={i} className={`${gs.testCard} ${t.locked?gs.testLocked:''}`} onClick={()=>nav(cat.slug,i)}>
   <span className={gs.lvl}>{i+1}</span><b>{t.name}</b><small>10 questions · instant explanations</small>
   <span className={gs.testFoot}>{t.locked?<><Lock/> Plan</>:b>0?<>Best {b}/10</>:<>Start <Arrow/></>}</span></button>;})}</div>
  <h2 className={gs.h2}>Key rules</h2>
  <div className={gs.rules}>{cat.rules.map(r=><div key={r.rule} className={gs.rule}><p>{r.rule}</p><code>{r.example}</code></div>)}</div>
  <h2 className={gs.h2}>Common mistakes</h2>
  <div className={gs.mist}>{cat.mistakes.map(m=><div key={m.wrong} className={gs.mItem}><p className={gs.bad}>{m.wrong}</p><p className={gs.good}>{m.right}</p><small>{m.why}</small></div>)}</div>
  <div className={gs.tip}><span className={styles.label}>IELTS tip</span><p>{cat.tip}</p></div>
 </div>;
 return <div className={styles.page}>
  <section className={styles.hero}>
   <span className={styles.eyebrow}>GRAMMAR PRACTICE</span>
   <h1>Grammar for IELTS, <em>test by test</em></h1>
   <p>{cats.length}টা category, প্রতিটায় ৩ level-এর test। প্রতিটা উত্তরের সাথে কেন ঠিক বা ভুল তার ব্যাখ্যা পাবে। আগে rule আর common mistake পড়ে নাও, তারপর test দাও।</p>
   <ul className={styles.stats}><li><b>{cats.length}</b>categories</li><li><b>{total}</b>tests</li><li><b>{free}</b>free tests</li><li><b>{doneTests}</b>tests tried</li></ul>
   <div className={styles.searchWrap}><input className={styles.search} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search a topic, e.g. articles, passive" aria-label="Search grammar"/></div>
  </section>
  <div className={styles.catGrid}>{found.map(c=>{const d=c.tests.filter((_,i)=>(scores[`${c.slug}:${i}`]||0)>0).length;return <button key={c.slug} className={styles.catCard} onClick={()=>nav(c.slug)}><b>{c.title}</b><span>3 tests · 1 free</span><div className={styles.bar}><i style={{width:`${d/3*100}%`}}/></div><small>{d}/3 tried</small></button>;})}</div>
  {!found.length&&<p className={styles.count}>No category matches your search.</p>}
  <div className={styles.upsell}><div><h3>প্রতিটা category-র Foundation test free</h3><p>Plan নিলে Intermediate ও IELTS Band 7 test-গুলোও খুলে যাবে।</p></div><Link href="/pricing" className={styles.primary}>See plans</Link></div>
 </div>;
}
