'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {VocabWord} from '@/lib/vocabulary';
import {speak} from './speak';
import styles from './vocabulary.module.css';
import type {Rec} from './use-progress';
type Props={ids:number[];recs:Record<string,Rec>;review:(id:number,good:boolean)=>void;details:(ids:number[])=>Promise<Record<number,VocabWord>>;onQuiz:(ids:number[])=>void;label:string};
const SESSION=20;
export function Flashcards({ids,recs,review,details,onQuiz,label}:Props){
 // Due words first, then new, then the rest; a session is 20 cards.
 const deck=useMemo(()=>{
  const now=Date.now();
  const score=(id:number)=>{const r=recs[id];if(!r||r.b<=0)return 1;return r.d<=now?0:2+r.b;};
  return [...ids].sort((a,b)=>score(a)-score(b)||Math.random()-0.5).slice(0,SESSION);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[ids.join(',')]);
 const [queue,setQueue]=useState<number[]>(deck),[cards,setCards]=useState<Record<number,VocabWord>>({}),[flip,setFlip]=useState(false),[done,setDone]=useState<{id:number;ok:boolean}[]>([]),[round,setRound]=useState(0);
 useEffect(()=>{miss.current={};setQueue(deck);setDone([]);setFlip(false);void details(deck).then(setCards);},[deck,round,details]);
 const id=queue[0];const w=id?cards[id]:undefined;
 const miss=useRef<Record<number,number>>({});
 const answer=useCallback((ok:boolean)=>{
  if(!id)return;review(id,ok);setDone(d=>[...d,{id,ok}]);setFlip(false);
  // A missed card returns to the end of the queue once; a second miss leaves it out of this session.
  const m=ok?0:(miss.current[id]=(miss.current[id]||0)+1);
  setQueue(q=>{const [first,...rest]=q;return ok||m>=2?rest:[...rest,first];});
 },[id,review]);
 useEffect(()=>{
  const onKey=(e:KeyboardEvent)=>{
   const t=e.target as HTMLElement;if(['INPUT','TEXTAREA','SELECT'].includes(t.tagName))return;
   if(e.key===' '||e.key==='Enter'){e.preventDefault();setFlip(f=>!f);}
   if(flip&&(e.key==='ArrowRight'||e.key==='2'))answer(true);
   if(flip&&(e.key==='ArrowLeft'||e.key==='1'))answer(false);
  };
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 },[flip,answer]);
 if(!deck.length)return <div className={styles.empty}><h3>No words to study here</h3><p>Change the filters, or unlock more words.</p></div>;
 const first=deck.length-queue.length;
 if(!queue.length){
  const missed=[...new Set(done.filter(d=>!d.ok).map(d=>d.id))];
  return <div className={styles.summary}><div className={styles.bigNum}>{deck.length}<small>cards done</small></div>
   <p>{missed.length?`${missed.length} word${missed.length>1?'s':''} need another look. They come back sooner next time.`:'Every card remembered. Nice work.'}</p>
   <div className={styles.row}><button className={styles.primary} onClick={()=>setRound(r=>r+1)}>Study again</button><button className={styles.ghost} onClick={()=>onQuiz(deck)}>Quiz on these words</button></div></div>;
 }
 return <div className={styles.fcWrap}>
  <div className={styles.fcTop}><span>{label}</span><span>{Math.min(deck.length,first+1)} / {deck.length}</span></div>
  <div className={styles.bar}><i style={{width:`${(first/deck.length)*100}%`}}/></div>
  <div className={`${styles.fc} ${flip?styles.flipped:''}`} onClick={()=>setFlip(f=>!f)} role="button" tabIndex={0} aria-label="Flip card">
   <div className={styles.fcInner}>
    <div className={styles.fcFront}>
     {w?<><span className={styles.fcPos}>{w.pos.join(' / ')} · Band {w.band}{w.band===8?'+':''}</span><div className={styles.fcWord}>{w.word}</div>
      <button type="button" className={styles.listen} onClick={e=>{e.stopPropagation();speak(w.word);}}>🔊 Listen</button><span className={styles.hint}>Tap or press Space to flip</span></>:<span className={styles.hint}>Loading…</span>}
    </div>
    <div className={styles.fcBack}>
     {w&&<><div className={styles.fcMean}>{w.meaningEn}</div><div className={styles.fcBn} lang="bn">{w.meaningBn}</div>
      <p className={styles.fcEx}><b>Writing</b>{w.examples[0]?.text}</p><p className={styles.fcEx}><b>Speaking</b>{w.examples[1]?.text}</p>
      {w.collocations.length>0&&<div className={styles.chips}>{w.collocations.slice(0,3).map(c=><span key={c}>{c}</span>)}</div>}</>}
    </div>
   </div>
  </div>
  <div className={styles.fcActions}>
   <button className={styles.again} disabled={!flip} onClick={()=>answer(false)}>Again <kbd>1</kbd></button>
   <button className={styles.good} disabled={!flip} onClick={()=>answer(true)}>I know it <kbd>2</kbd></button>
  </div>
 </div>;
}
