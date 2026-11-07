'use client';
import {useState} from 'react';
import styles from './vocabulary.module.css';
import type {VocabWord} from '@/lib/vocabulary';
export function speak(text:string){
 try{const u=new SpeechSynthesisUtterance(text);u.lang='en-GB';u.rate=0.9;window.speechSynthesis.cancel();window.speechSynthesis.speak(u);}catch{/* speech not supported */}
}
export function WordCard({w}:{w:VocabWord}){
 const [open,setOpen]=useState(false);
 return <article className={styles.card}>
  <header className={styles.head}>
   <div><h3 className={styles.word}>{w.word}</h3><span className={styles.pos}>{w.pos.join(' / ')}</span></div>
   <div className={styles.actions}><button type="button" className={styles.icon} onClick={()=>speak(w.word)} aria-label={`Listen to ${w.word}`}>Listen</button><span className={styles.band}>Band {w.band}{w.band===8?'+':''}</span></div>
  </header>
  <p className={styles.en}>{w.meaningEn}</p>
  <p className={styles.bn} lang="bn">{w.meaningBn}</p>
  <div className={styles.tags}>{w.topics.map(t=><span key={t}>{t}</span>)}{w.useIn.map(t=><span key={t} className={styles.use}>{t}</span>)}</div>
  <button type="button" className={styles.more} onClick={()=>setOpen(!open)} aria-expanded={open}>{open?'Hide examples':'Examples and collocations'}</button>
  {open&&<div className={styles.detail}>
   {w.examples.map((e,i)=><p key={i}><b>{e.kind==='writing'?'Writing':'Speaking'}:</b> {e.text}</p>)}
   {w.collocations.length>0&&<p><b>Collocations:</b> {w.collocations.join(' · ')}</p>}
   {w.wordFamily.length>0&&<p><b>Word family:</b> {w.wordFamily.join(', ')}</p>}
   {w.synonyms.length>0&&<p><b>Synonyms:</b> {w.synonyms.join(', ')}</p>}
   {w.antonyms.length>0&&<p><b>Antonyms:</b> {w.antonyms.join(', ')}</p>}
  </div>}
 </article>;
}
