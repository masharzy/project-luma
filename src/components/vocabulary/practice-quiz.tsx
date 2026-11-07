'use client';
import {useState} from 'react';
import styles from './vocabulary.module.css';
type Q={word:string;sentence:string;answer:string;options:string[]};
export function PracticeQuiz({questions}:{questions:Q[]}){
 const [i,setI]=useState(0);const [picked,setPicked]=useState<string|null>(null);const [score,setScore]=useState(0);
 if(!questions.length)return <p>No practice questions for this filter yet.</p>;
 if(i>=questions.length)return <div className={styles.card}><h3>Score: {score} / {questions.length}</h3><button type="button" className={styles.more} onClick={()=>{setI(0);setPicked(null);setScore(0);}}>Try again</button></div>;
 const q=questions[i];
 return <div className={styles.card}>
  <p className={styles.pos}>Question {i+1} of {questions.length}</p>
  <p className={styles.en}>{q.sentence}</p>
  <div className={styles.options}>{q.options.map(o=>{
   const state=picked===null?'':o===q.answer?styles.right:o===picked?styles.wrong:'';
   return <button key={o} type="button" disabled={picked!==null} className={`${styles.option} ${state}`} onClick={()=>{setPicked(o);if(o===q.answer)setScore(s=>s+1);}}>{o}</button>;
  })}</div>
  {picked!==null&&<button type="button" className={styles.more} onClick={()=>{setI(i+1);setPicked(null);}}>{i+1===questions.length?'See score':'Next'}</button>}
 </div>;
}
