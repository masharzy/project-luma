'use client';
import {useEffect,useState} from 'react';
import type {QuizQuestion} from '@/lib/vocabulary';
import {speak} from './speak';
import {SpeakerIcon} from './icons';
import styles from './vocabulary.module.css';
type Props={ids:number[];review:(id:number,good:boolean)=>void;onStudy:(ids:number[])=>void;seed:number};
export function Quiz({ids,review,onStudy,seed}:Props){
 const [qs,setQs]=useState<QuizQuestion[]|null>(null),[i,setI]=useState(0),[picked,setPicked]=useState<string|null>(null),[res,setRes]=useState<{id:number;ok:boolean;word:string}[]>([]),[run,setRun]=useState(0),[err,setErr]=useState(false);
 useEffect(()=>{
  let live=true;setQs(null);setI(0);setPicked(null);setRes([]);setErr(false);
  const pool=[...ids].sort(()=>Math.random()-0.5).slice(0,200);
  void fetch('/api/vocabulary/quiz?n=10&ids='+pool.join(','),{cache:'no-store'}).then(r=>r.json()).then(d=>{if(live)setQs(d.questions);}).catch(()=>{if(live)setErr(true);});
  return()=>{live=false;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[seed,run]);
 if(err)return <div className={styles.empty}><h3>Could not load the quiz</h3><button className={styles.primary} onClick={()=>setRun(r=>r+1)}>Try again</button></div>;
 if(!ids.length)return <div className={styles.empty}><h3>No words to quiz</h3><p>Change the filters, or unlock more words.</p></div>;
 if(!qs)return <div className={styles.empty}><p>Preparing questions…</p></div>;
 if(!qs.length)return <div className={styles.empty}><h3>No questions for this filter</h3></div>;
 if(i>=qs.length){
  const score=res.filter(r=>r.ok).length,wrong=res.filter(r=>!r.ok);
  return <div className={styles.summary}><div className={styles.bigNum}>{score}<small>/ {qs.length}</small></div>
   <p>{score>=qs.length*0.8?'Strong. These words are getting solid.':score>=qs.length*0.5?'Good start. Review the missed ones below.':'Keep going. Flashcards will help these stick.'}</p>
   {wrong.length>0&&<div className={styles.chips}>{wrong.map(w=><span key={w.id}>{w.word}</span>)}</div>}
   <div className={styles.row}><button className={styles.primary} onClick={()=>setRun(r=>r+1)}>New quiz</button>{wrong.length>0&&<button className={styles.ghost} onClick={()=>onStudy(wrong.map(w=>w.id))}>Study missed words</button>}</div></div>;
 }
 const q=qs[i];const parts=q.sentence.split('_____');
 return <div className={styles.quiz}>
  <div className={styles.fcTop}><span>Question {i+1} of {qs.length}</span><span>{res.filter(r=>r.ok).length} correct</span></div>
  <div className={styles.bar}><i style={{width:`${(i/qs.length)*100}%`}}/></div>
  <p className={styles.sentence}>{parts[0]}<span className={styles.blank}>{picked?q.answer:'_____'}</span>{parts[1]}</p>
  <div className={styles.options}>{q.options.map(o=>{
   const cls=picked===null?'':o===q.answer?styles.right:o===picked?styles.wrong:styles.dim;
   return <button key={o} disabled={picked!==null} className={`${styles.option} ${cls}`} onClick={()=>{setPicked(o);const ok=o===q.answer;setRes(r=>[...r,{id:q.id,ok,word:q.word}]);review(q.id,ok);}}>{o}</button>;
  })}</div>
  {picked!==null&&<div className={styles.explain}><div><b>{q.word}</b> — {q.meaning}<br/><span lang="bn">{q.meaningBn}</span></div><button className={styles.listen} onClick={()=>speak(q.word)}><SpeakerIcon/></button>
   <button className={styles.primary} onClick={()=>{setI(i+1);setPicked(null);}}>{i+1===qs.length?'See result':'Next'}</button></div>}
 </div>;
}
