'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import type {CueCard} from '@/lib/cue-cards';
import styles from './cue-cards.module.css';
type Tab='cue'|'part3'|'vocab';
const KEY='jtn.cue.done';
const short=(t:string)=>t.replace(/^(Describe|Talk about)\s+/i,'').replace(/\.$/,'');
const cap=(s:string)=>s.charAt(0).toUpperCase()+s.slice(1);
function useDone(){
 const [done,setDone]=useState<number[]>([]);
 useEffect(()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(v))setDone(v.filter(x=>typeof x==='number'));}catch{}},[]);
 const toggle=useCallback((id:number)=>setDone(d=>{const n=d.includes(id)?d.filter(x=>x!==id):[...d,id];try{localStorage.setItem(KEY,JSON.stringify(n));}catch{}return n;}),[]);
 return{done,toggle};
}
function Check(){return <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;}
function Lock(){return <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden><rect x="4" y="9" width="12" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M7 9V6.5a3 3 0 016 0V9" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>;}
function Arrow(){return <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden><path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;}

function Topic({card,list,done,toggle,go,onBack}:{card:CueCard;list:CueCard[];done:boolean;toggle:()=>void;go:(c:CueCard)=>void;onBack:()=>void}){
 const [tab,setTab]=useState<Tab>('cue'),[full,setFull]=useState(false),[openQ,setOpenQ]=useState(0);
 useEffect(()=>{setTab('cue');setFull(false);setOpenQ(0);window.scrollTo({top:0});},[card.id]);
 const i=list.findIndex(c=>c.id===card.id),prev=list[i-1],next=list[i+1];
 if(card.locked||!card.steps)return <div className={styles.lockPanel}><Lock/><h2>{card.title}</h2><p>এই topic-এর sample answer, Part 3 উত্তর আর vocabulary plan-এর সাথে খোলে। প্রতিটা category-র প্রথম ৩টা topic free।</p><div className={styles.row}><Link href="/pricing" className={styles.primary}>See plans</Link><button className={styles.ghost} onClick={onBack}>Back to list</button></div></div>;
 const all=card.steps.flatMap(s=>s.sentences).join(' ');
 return <div>
  <header className={styles.topicHead}>
   <span className={styles.tag}>{card.category} · Topic {card.no}</span>
   <h1>{card.title}</h1>
   <div className={styles.tabs} role="tablist">
    {([['cue','Cue Card'],['part3','Part 3'],['vocab','Vocabulary']] as [Tab,string][]).map(([k,l])=><button key={k} role="tab" aria-selected={tab===k} className={tab===k?styles.tabOn:''} onClick={()=>setTab(k)}>{l}</button>)}
   </div>
  </header>
  {tab==='cue'&&<div className={styles.cueGrid}>
   <aside className={styles.cueSide}>
    <div className={styles.cueBox}><span className={styles.label}>You should say</span><ul>{card.prompts?.map(p=><li key={p}>{p}</li>)}</ul></div>
    <div className={styles.meta}><span className={styles.label}>Possible angles</span><ul>{card.angles?.map(a=><li key={a}>{cap(a)}</li>)}</ul></div>
    <div className={styles.meta}><span className={styles.label}>Target time</span><b className={styles.target}>{card.target} min</b><small>1 মিনিট ভাবার পর বলার সময়</small></div>
   </aside>
   <div>
    <div className={styles.modeRow}><div className={styles.seg}><button className={!full?styles.segOn:''} onClick={()=>setFull(false)}>Step by step</button><button className={full?styles.segOn:''} onClick={()=>setFull(true)}>Full answer</button></div><small>নিজের গল্প দিয়ে একই কাঠামো ব্যবহার করো</small></div>
    {!full?<ol className={styles.steps}>{card.steps.map(s=><li key={s.n} className={styles.stepItem}>
     <div className={styles.stepNo}>{s.n}</div>
     <div className={styles.stepBody}>
      <div className={styles.stepHead}><h3>{s.label}</h3><span className={styles.time}>{s.time}</span></div>
      <p className={styles.anchor}><span>Start with</span>{s.anchor}</p>
      <p className={styles.sample}>{s.sentences.join(' ')}</p>
     </div></li>)}</ol>
    :<div className={styles.fullAns}><p>{all}</p></div>}
   </div>
  </div>}
  {tab==='part3'&&<div className={styles.qa}>
   <p className={styles.hint}>Part 3-এ examiner আরও গভীর প্রশ্ন করে। প্রতিটা উত্তরে মত, কারণ আর একটা উদাহরণ দাও।</p>
   {card.part3?.map((x,k)=><div key={x.q} className={`${styles.qItem} ${openQ===k?styles.qOpen:''}`}>
    <button aria-expanded={openQ===k} onClick={()=>setOpenQ(openQ===k?-1:k)}><span className={styles.qNo}>{k+1}</span><b>{x.q}</b><i><Arrow/></i></button>
    {openQ===k&&<p>{x.a}</p>}
   </div>)}
  </div>}
  {tab==='vocab'&&<div>
   <p className={styles.hint}>এই topic-এ কাজে লাগবে এমন শব্দ ও phrase। উত্তর দেওয়ার সময় ২-৩টা ব্যবহার করার চেষ্টা করো।</p>
   <div className={styles.phraseGrid}>{card.phrases?.map(x=><div key={x.p} className={styles.phrase}><b>{x.p}</b><span>{x.m}</span></div>)}</div>
  </div>}
  <footer className={styles.topicFoot}>
   <button className={done?styles.doneOn:styles.doneBtn} onClick={toggle}>{done&&<Check/>}{done?'Marked as done':'Mark as done'}</button>
   <div className={styles.row}>
    {prev&&<button className={styles.ghost} onClick={()=>go(prev)}>Previous</button>}
    {next&&<button className={styles.primary} onClick={()=>go(next)}>Next topic</button>}
   </div>
  </footer>
 </div>;
}

export function CueApp({cards,categories}:{cards:CueCard[];categories:string[]}){
 const [route,setRoute]=useState<{cat:string;no:number}>({cat:'',no:0}),[q,setQ]=useState('');
 const {done,toggle}=useDone();
 const parse=useCallback(()=>{const h=decodeURIComponent(location.hash.slice(1));const [c,n]=h.split('/');setRoute({cat:categories.includes(c)?c:'',no:categories.includes(c)?Number(n)||0:0});},[categories]);
 useEffect(()=>{parse();window.addEventListener('hashchange',parse);return()=>window.removeEventListener('hashchange',parse);},[parse]);
 const nav=(cat:string,no=0)=>{location.hash=cat?`${encodeURIComponent(cat)}${no?'/'+no:''}`:'';if(!cat)history.replaceState(null,'',location.pathname);parse();window.scrollTo({top:0});};
 const inCat=useMemo(()=>cards.filter(c=>c.category===route.cat),[cards,route.cat]);
 const current=route.no?inCat.find(c=>c.no===route.no):undefined;
 const freeCount=cards.filter(c=>!c.locked).length;
 const found=useMemo(()=>{const n=q.trim().toLowerCase();return n?cards.filter(c=>c.title.toLowerCase().includes(n)||c.category.toLowerCase().includes(n)).slice(0,30):[];},[cards,q]);
 const Row=({c}:{c:CueCard})=><button className={`${styles.rowItem} ${c.locked?styles.rowLocked:''}`} onClick={()=>nav(c.category,c.no)}>
  <span className={`${styles.num} ${done.includes(c.id)?styles.numDone:''}`}>{done.includes(c.id)?<Check/>:c.no}</span>
  <span className={styles.rowTitle}>{c.title}</span>
  {q&&<small className={styles.rowCat}>{c.category}</small>}
  {c.locked?<span className={styles.rowIcon}><Lock/></span>:<span className={styles.rowIcon}><Arrow/></span>}
 </button>;

 if(route.cat&&current)return <div className={styles.page}>
  <nav className={styles.crumbs}><button onClick={()=>nav('')}>All categories</button><span>/</span><button onClick={()=>nav(route.cat)}>{route.cat}</button></nav>
  <Topic card={current} list={inCat} done={done.includes(current.id)} toggle={()=>toggle(current.id)} go={c=>nav(c.category,c.no)} onBack={()=>nav(route.cat)}/>
 </div>;

 if(route.cat){
  const d=inCat.filter(c=>done.includes(c.id)).length;
  return <div className={styles.page}>
   <nav className={styles.crumbs}><button onClick={()=>nav('')}>All categories</button><span>/</span><b>{route.cat}</b></nav>
   <div className={styles.catHead}><div><span className={styles.eyebrow}>CATEGORY</span><h1>{route.cat}</h1><p>{inCat.length} topics · {inCat.filter(c=>!c.locked).length} free · {d} done</p></div>
    <div className={styles.bigBar} aria-label={`${d} of ${inCat.length} done`}><i style={{width:`${inCat.length?d/inCat.length*100:0}%`}}/></div></div>
   <div className={styles.list}>{inCat.map(c=><Row key={c.id} c={c}/>)}</div>
   {inCat.some(c=>c.locked)&&<div className={styles.upsell}><div><h3>আরও {inCat.filter(c=>c.locked).length}টা topic</h3><p>Plan নিলে এই category-র সব sample answer, Part 3 উত্তর ও vocabulary খুলে যাবে।</p></div><Link href="/pricing" className={styles.primary}>See plans</Link></div>}
  </div>;
 }

 const total=done.length;
 return <div className={styles.page}>
  <section className={styles.hero}>
   <span className={styles.eyebrow}>SPEAKING PART 2 AND 3</span>
   <h1>Cue card sample answer, <em>step by step</em></h1>
   <p>Topic বেছে নাও। প্রতিটায় cue card, ধাপে ধাপে সাজানো sample answer, Part 3-এর model answer আর কাজের vocabulary পাবে। পড়ো, কাঠামোটা বুঝো, তারপর নিজের গল্পে বলো।</p>
   <ul className={styles.stats}><li><b>{cards.length}</b>topics</li><li><b>{categories.length}</b>categories</li><li><b>{freeCount}</b>free topics</li><li><b>{total}</b>done by you</li></ul>
   <div className={styles.searchWrap}><input className={styles.search} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search a topic, e.g. teacher, festival, app" aria-label="Search topics"/></div>
  </section>
  {q?<section><p className={styles.count}><b>{found.length}</b> results</p><div className={styles.list}>{found.map(c=><Row key={c.id} c={c}/>)}</div></section>
  :<>
   <div className={styles.sectionHead}><h2>Choose a category</h2><p>The first 3 topics in every category are free.</p></div>
   <div className={styles.catGrid}>{categories.map(c=>{const l=cards.filter(x=>x.category===c);const d=l.filter(x=>done.includes(x.id)).length;return <button key={c} className={styles.catCard} onClick={()=>nav(c)}>
    <b>{c}</b><span>{l.length} topics · {l.filter(x=>!x.locked).length} free</span>
    <div className={styles.bar}><i style={{width:`${d/l.length*100}%`}}/></div><small>{d}/{l.length} done</small></button>;})}</div>
   <section className={styles.how}>
    <div className={styles.step}><span>1</span><h3>Cue card পড়ো</h3><p>কী কী বলতে হবে আর কোন কোন angle নেওয়া যায় দেখে নাও।</p></div>
    <div className={styles.step}><span>2</span><h3>ধাপগুলো অনুসরণ করো</h3><p>Opening থেকে wrap-up পর্যন্ত প্রতিটা ধাপের সময় ও শুরুর বাক্য দেওয়া আছে।</p></div>
    <div className={styles.step}><span>3</span><h3>Part 3 ও vocabulary</h3><p>Examiner-এর follow-up প্রশ্নের উত্তর আর topic-এর শব্দ শিখে নিজের উত্তরে বসাও।</p></div>
   </section>
  </>}
 </div>;
}
