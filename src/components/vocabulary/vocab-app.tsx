'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {VocabIndexItem,VocabWord} from '@/lib/vocabulary';
import {TOPICS,USES,FREE_LIMIT} from '@/lib/vocab-constants';
import {statusOf,useProgress} from './use-progress';
import {Flashcards} from './flashcards';
import {Quiz} from './quiz';
import {speak} from './speak';
import styles from './vocabulary.module.css';
type Mode='explore'|'cards'|'quiz';
type StatusFilter='all'|'new'|'learning'|'mastered'|'locked';
type Initial={topic?:string;band?:number;use?:string;q?:string;mode?:Mode};
const TOPIC_ICON:Record<string,string>={Education:'🎓',Environment:'🌿',Technology:'💻',Health:'🩺','Work & Economy':'💼','Society & Family':'👪','Government & Law':'⚖️','Media & Communication':'📰','Travel & Transport':'✈️','Arts & Culture':'🎨','Science & Research':'🔬','Crime & Safety':'🛡️','Behaviour & Character':'🧠','General Academic':'📘'};
const bandLabel=(b:number)=>`Band ${b}${b===8?'+':''}`;
function Ring({value,size=96,label,sub}:{value:number;size?:number;label:string;sub:string}){
 const r=size/2-8,c=2*Math.PI*r;
 return <div className={styles.ring} style={{width:size,height:size}}><svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><circle cx={size/2} cy={size/2} r={r} className={styles.ringBg}/><circle cx={size/2} cy={size/2} r={r} className={styles.ringFg} strokeDasharray={c} strokeDashoffset={c*(1-Math.min(1,value))} transform={`rotate(-90 ${size/2} ${size/2})`}/></svg><div><b>{label}</b><small>{sub}</small></div></div>;
}
export function VocabApp({items,open,authed,initial}:{items:VocabIndexItem[];open:number;authed:boolean;initial:Initial}){
 const {recs,ready,review,setKnown,streak,todayN}=useProgress(authed);
 const [mode,setMode]=useState<Mode>(initial.mode??'explore');
 const [q,setQ]=useState(initial.q??''),[topic,setTopic]=useState(initial.topic??''),[band,setBand]=useState(initial.band??0),[use,setUse]=useState(initial.use??''),[status,setStatus]=useState<StatusFilter>('all');
 const [limit,setLimit]=useState(36),[expanded,setExpanded]=useState<number|null>(null),[quizSeed,setQuizSeed]=useState(0),[forced,setForced]=useState<number[]|null>(null);
 const cache=useRef<Map<number,VocabWord>>(new Map()),[,bump]=useState(0);
 const studyRef=useRef<HTMLDivElement>(null);
 const total=items.length,locked=total-items.filter(i=>i.m).length;
 const details=useCallback(async(ids:number[])=>{
  const need=ids.filter(id=>!cache.current.has(id));
  for(let i=0;i<need.length;i+=40){
   const r=await fetch('/api/vocabulary/words?ids='+need.slice(i,i+40).join(','),{cache:'no-store'}).then(x=>x.json()).catch(()=>({words:[]}));
   for(const w of r.words as VocabWord[])cache.current.set(w.id,w);
  }
  bump(n=>n+1);
  return Object.fromEntries(ids.filter(id=>cache.current.has(id)).map(id=>[id,cache.current.get(id)!])) as Record<number,VocabWord>;
 },[]);
 const filtered=useMemo(()=>{
  const needle=q.trim().toLowerCase();
  return items.filter(i=>{
   if(topic&&!i.t.includes(topic))return false;
   if(band&&i.b!==band)return false;
   if(use&&!i.u.includes(use))return false;
   if(needle&&!i.w.startsWith(needle)&&!(i.m||'').toLowerCase().includes(needle)&&!(i.n||'').includes(needle))return false;
   const isLocked=!i.m;
   if(status==='locked')return isLocked;
   if(status==='all')return true;
   if(isLocked)return false;
   return statusOf(recs[i.id])===status;
  });
 },[items,q,topic,band,use,status,recs]);
 const unlockedIds=useMemo(()=>filtered.filter(i=>i.m).map(i=>i.id),[filtered]);
 useEffect(()=>setLimit(36),[q,topic,band,use,status]);
 useEffect(()=>{
  const p=new URLSearchParams();if(topic)p.set('topic',topic);if(band)p.set('band',String(band));if(use)p.set('use',use);if(q)p.set('q',q);if(mode!=='explore')p.set('mode',mode);
  const s=p.toString();window.history.replaceState(null,'',s?`?${s}`:window.location.pathname);
 },[topic,band,use,q,mode]);
 const counts=useMemo(()=>{
  const m:Record<string,number>={};for(const i of items)for(const t of i.t)m[t]=(m[t]||0)+1;return m;
 },[items]);
 const unlocked=items.filter(i=>i.m);
 const mastered=unlocked.filter(i=>statusOf(recs[i.id])==='mastered').length;
 const learning=unlocked.filter(i=>statusOf(recs[i.id])==='learning').length;
 const freeItems=items.filter(i=>i.p<=FREE_LIMIT);
 const freeDone=freeItems.filter(i=>statusOf(recs[i.id])==='mastered').length;
 const dueCount=unlocked.filter(i=>{const r=recs[i.id];return r&&r.b>0&&r.d<=Date.now();}).length;
 const [wotd,setWotd]=useState<VocabIndexItem|null>(null);
 useEffect(()=>{const pool=unlocked.filter(i=>i.s==='core'&&i.b>=7);if(pool.length)setWotd(pool[Math.floor(Date.now()/864e5)%pool.length]);// eslint-disable-next-line react-hooks/exhaustive-deps
 },[items]);
 const go=(m:Mode,ids?:number[])=>{setForced(ids??null);setMode(m);if(m==='quiz')setQuizSeed(s=>s+1);setTimeout(()=>studyRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),50);};
 const studyIds=forced??unlockedIds;
 const reset=()=>{setQ('');setTopic('');setBand(0);setUse('');setStatus('all');setForced(null);};
 const filterLabel=[topic,band?bandLabel(band):'',use,q?`“${q}”`:''].filter(Boolean).join(' · ')||'All words';
 const goal=10;
 return <div className={styles.page}>
  {/* HERO */}
  <section className={styles.hero}>
   <div className={styles.heroGlow} aria-hidden="true"/>
   <div className={styles.heroInner}>
    <div className={styles.heroText}>
     <span className={styles.eyebrow}>IELTS VOCABULARY</span>
     <h1>এমন শব্দ শেখো, যেটা তোমার <em>Band</em> বাড়ায়।</h1>
     <p>{total.toLocaleString()} IELTS words, topic আর band অনুযায়ী সাজানো। প্রতিটা শব্দে বাংলা মানে, Writing ও Speaking-এর আলাদা example, collocation আর নিজে যাচাই করার quiz।</p>
     <div className={styles.heroCta}>
      <button className={styles.primary} onClick={()=>go('cards',unlockedIds.length?undefined:undefined)}>Start flashcards</button>
      <button className={styles.ghostLight} onClick={()=>go('quiz')}>Take a quick quiz</button>
     </div>
     <ul className={styles.stats}><li><b>{total.toLocaleString()}</b>words</li><li><b>14</b>IELTS topics</li><li><b>{FREE_LIMIT}</b>free words</li><li><b>বাংলা</b>meaning on every word</li></ul>
    </div>
    <aside className={styles.dash} aria-label="Your progress">
     <div className={styles.dashTop}>
      <Ring value={unlocked.length?mastered/unlocked.length:0} label={String(mastered)} sub="mastered"/>
      <div className={styles.dashStats}>
       <div><b>{ready?streak:0}</b><span>day streak 🔥</span></div>
       <div><b>{learning}</b><span>in progress</span></div>
       <div><b>{dueCount}</b><span>due to review</span></div>
      </div>
     </div>
     <div className={styles.goal}><div className={styles.goalHead}><span>Today&apos;s goal</span><b>{Math.min(todayN,goal)} / {goal} cards</b></div><div className={styles.bar}><i style={{width:`${Math.min(1,todayN/goal)*100}%`}}/></div></div>
     <div className={styles.goal}><div className={styles.goalHead}><span>Free words learned</span><b>{freeDone} / {FREE_LIMIT}</b></div><div className={styles.bar}><i style={{width:`${(freeDone/FREE_LIMIT)*100}%`}}/></div></div>
     {!authed&&<p className={styles.dashNote}>Progress is saved in this browser. <Link href="/auth/sign-in">Log in</Link> to keep it on every device.</p>}
    </aside>
   </div>
  </section>

  {wotd&&<section className={styles.wotd}><div><span className={styles.eyebrowDark}>WORD OF THE DAY</span><h2>{wotd.w}</h2><p>{wotd.m}</p><p lang="bn" className={styles.bnLine}>{wotd.n}</p></div>
   <div className={styles.wotdBtns}><button className={styles.ghost} onClick={()=>speak(wotd.w)}>🔊 Listen</button><button className={styles.primary} onClick={()=>{setQ(wotd.w);setExpanded(wotd.id);void details([wotd.id]);setMode('explore');studyRef.current?.scrollIntoView({behavior:'smooth'});}}>See examples</button></div></section>}

  {/* TOPICS */}
  <section className={styles.section}>
   <div className={styles.sectionHead}><h2>Topic ধরে শেখো</h2><p>IELTS-এ যে topic-গুলো সবচেয়ে বেশি আসে, সেগুলো আলাদা করে সাজানো।</p></div>
   <div className={styles.topicGrid}>{TOPICS.map(t=><button key={t} className={`${styles.topic} ${topic===t?styles.topicOn:''}`} onClick={()=>{setTopic(topic===t?'':t);setMode('explore');studyRef.current?.scrollIntoView({behavior:'smooth'});}}><span className={styles.topicIcon}>{TOPIC_ICON[t]}</span><b>{t}</b><small>{counts[t]||0} words</small></button>)}</div>
  </section>

  {/* STUDY AREA */}
  <section className={styles.study} ref={studyRef} id="study">
   <div className={styles.tabs} role="tablist">
    {([['explore','Explore','Browse every word'],['cards','Flashcards','Learn with spaced review'],['quiz','Quiz','Test yourself']] as const).map(([m,l,s])=><button key={m} role="tab" aria-selected={mode===m} className={`${styles.tab} ${mode===m?styles.tabOn:''}`} onClick={()=>{setForced(null);setMode(m);if(m==='quiz')setQuizSeed(x=>x+1);}}><b>{l}</b><small>{s}</small></button>)}
   </div>
   <div className={styles.filters}>
    <div className={styles.search}><span aria-hidden="true">🔍</span><input value={q} onChange={e=>{setQ(e.target.value);setForced(null);}} placeholder="Search a word or meaning (English or বাংলা)" aria-label="Search words"/>{q&&<button onClick={()=>setQ('')} aria-label="Clear search">×</button>}</div>
    <div className={styles.chipRow} aria-label="Band">{[0,6,7,8].map(b=><button key={b} className={`${styles.pill} ${band===b?styles.pillOn:''}`} onClick={()=>{setBand(b);setForced(null);}}>{b?bandLabel(b):'All bands'}</button>)}</div>
    <div className={styles.chipRow} aria-label="Use">{['',...USES].map(u=><button key={u||'all'} className={`${styles.pill} ${use===u?styles.pillOn:''}`} onClick={()=>{setUse(u);setForced(null);}}>{u||'All uses'}</button>)}</div>
    <div className={styles.chipRow} aria-label="Topic">{['',...TOPICS].map(t=><button key={t||'all'} className={`${styles.pill} ${styles.pillSoft} ${topic===t?styles.pillOn:''}`} onClick={()=>{setTopic(t);setForced(null);}}>{t||'All topics'}</button>)}</div>
    {mode==='explore'&&<div className={styles.chipRow} aria-label="Status">{([['all','All'],['new','New'],['learning','Learning'],['mastered','Mastered'],['locked','Locked']] as const).map(([s,l])=><button key={s} className={`${styles.pill} ${styles.pillSoft} ${status===s?styles.pillOn:''}`} onClick={()=>setStatus(s)}>{l}</button>)}</div>}
    <div className={styles.resultLine}><span><b>{filtered.length.toLocaleString()}</b> words · {filterLabel}</span>{(topic||band||use||q||status!=='all')&&<button onClick={reset}>Clear filters</button>}</div>
   </div>

   {mode==='cards'&&<Flashcards ids={studyIds} recs={recs} review={review} details={details} onQuiz={ids=>go('quiz',ids)} label={forced?'Selected words':filterLabel}/>}
   {mode==='quiz'&&<Quiz ids={studyIds} review={review} onStudy={ids=>go('cards',ids)} seed={quizSeed}/>}
   {mode==='explore'&&<>
    {!filtered.length&&<div className={styles.empty}><h3>কোনো word পাওয়া যায়নি</h3><p>Filter বদলে দেখো।</p><button className={styles.ghost} onClick={reset}>Clear filters</button></div>}
    <div className={styles.grid}>{filtered.slice(0,limit).map(w=>{
     if(!w.m)return <article key={w.id} className={`${styles.card} ${styles.cardLocked}`}>
      <div className={styles.cardHead}><div><h3>{w.w}</h3><span className={styles.pos}>{w.pos.join(' / ')}</span></div><span className={styles.lockIcon} aria-hidden="true">🔒</span></div>
      <div className={styles.blur} aria-hidden="true"><i/><i/></div>
      <div className={styles.tags}><span className={styles.band}>{bandLabel(w.b)}</span>{w.t.slice(0,2).map(t=><span key={t}>{t}</span>)}</div>
      <Link href="/pricing" className={styles.unlock}>Unlock with a plan ↗</Link></article>;
     const st=statusOf(recs[w.id]);const d=cache.current.get(w.id);const isOpen=expanded===w.id;
     return <article key={w.id} className={`${styles.card} ${st==='mastered'?styles.cardDone:''}`}>
      <div className={styles.cardHead}><div><h3>{w.w}</h3><span className={styles.pos}>{w.pos.join(' / ')}</span></div>
       <div className={styles.cardBtns}><button className={styles.icon} onClick={()=>speak(w.w)} aria-label={`Listen to ${w.w}`}>🔊</button>
       <button className={`${styles.icon} ${st==='mastered'?styles.iconOn:''}`} onClick={()=>setKnown(w.id,st!=='mastered')} aria-pressed={st==='mastered'} aria-label={st==='mastered'?'Mark as not known':'Mark as known'}>{st==='mastered'?'✓':'○'}</button></div></div>
      <p className={styles.en}>{w.m}</p><p className={styles.bn} lang="bn">{w.n}</p>
      <div className={styles.tags}><span className={styles.band}>{bandLabel(w.b)}</span>{w.t.slice(0,2).map(t=><span key={t}>{t}</span>)}{w.u.slice(0,2).map(t=><span key={t} className={styles.use}>{t}</span>)}{st==='learning'&&<span className={styles.learning}>Learning</span>}</div>
      <button className={styles.more} aria-expanded={isOpen} onClick={()=>{setExpanded(isOpen?null:w.id);if(!isOpen)void details([w.id]);}}>{isOpen?'Hide details':'Examples & collocations'}</button>
      {isOpen&&<div className={styles.detail}>{!d?<p>Loading…</p>:<>
       {d.examples.map((e,i)=><p key={i}><b>{e.kind==='writing'?'Writing':'Speaking'}</b>{e.text}</p>)}
       {d.collocations.length>0&&<p><b>Collocations</b>{d.collocations.join(' · ')}</p>}
       {d.wordFamily.length>0&&<p><b>Word family</b>{d.wordFamily.join(', ')}</p>}
       {d.synonyms.length>0&&<p><b>Synonyms</b>{d.synonyms.join(', ')}</p>}
       {d.antonyms.length>0&&<p><b>Antonyms</b>{d.antonyms.join(', ')}</p>}</>}</div>}
     </article>;})}</div>
    {limit<filtered.length&&<div className={styles.moreRow}><button className={styles.ghost} onClick={()=>setLimit(l=>l+36)}>Show more ({filtered.length-limit} left)</button></div>}
    {locked>0&&<div className={styles.upsell}><div><h3>আরও {locked.toLocaleString()} টা word অপেক্ষা করছে</h3><p>এখন তুমি {open.toLocaleString()} টা word ব্যবহার করতে পারছ। Plan নিলে বাকি word, example আর quiz খুলে যাবে।</p></div><Link href="/pricing" className={styles.primary}>See plans ↗</Link></div>}
   </>}
  </section>
 </div>;
}
