'use client';
import {useMemo,useState} from 'react';
import {ArrowRight,BookOpen,Check,Headphones,Mic2,Clock3} from 'lucide-react';
import {SpeakingStart} from './speaking-start';
import {speakingBook} from '@/lib/learner/results';
import {availableSpeakingCollections,speakingSource,type SpeakingChoice} from '@/lib/learner/speaking-collections';
import {CustomSpeaking} from './custom-speaking';
export function SpeakingPicker({tests}:{tests:SpeakingChoice[]}){
 const collections=availableSpeakingCollections(tests);
 const [series,setSeries]=useState(collections.find(c=>c.count)?.key||collections[0]?.key||''),[book,setBook]=useState(''),[selected,setSelected]=useState('');
 const matching=useMemo(()=>tests.filter(t=>(t.collectionKey||speakingSource(t.title).collectionKey)===series),[tests,series]);
 const books=[...new Set(matching.map(t=>(t.bookLabel||speakingBook(t.title))))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
 const activeBook=books.includes(book)?book:books[0]||'';
 const list=matching.filter(t=>(t.bookLabel||speakingBook(t.title))===activeBook).sort((a,b)=>a.title.localeCompare(b.title,undefined,{numeric:true}));
 const current=list.find(t=>t.id===selected);
 const name=(t:string)=>t.replace(/\s*·\s*Speaking$/,'');
 return <section className="speaking-studio sp-one">
 <div className="sp-pick">
  <div className="sp-row" role="group" aria-label="Collection">{collections.map(c=><button key={c.key} type="button" className="sp-chip" aria-pressed={series===c.key} disabled={!c.count} onClick={()=>{setSeries(c.key);setBook('');setSelected('');}}><BookOpen size={15} aria-hidden/>{c.label}<b>{c.count}</b></button>)}</div>
  {books.length>0&&<div className="sp-row" role="group" aria-label="Book">{books.map(b=><button key={b} type="button" className="sp-chip" aria-pressed={activeBook===b} onClick={()=>{setBook(b);setSelected('');}}>{b}</button>)}</div>}
 </div>
 <div className="study-speaking-setup">
  <div className="study-speaking-tests" role="radiogroup" aria-label="Speaking tests">{list.map(t=><button key={t.id} type="button" role="radio" aria-checked={selected===t.id} aria-pressed={selected===t.id} onClick={()=>setSelected(t.id)}><span className="study-round-icon"><Headphones size={20}/></span><div><h3>{name(t.title)}</h3><p>{t.parts} parts · {t.minutes} minutes</p></div>{selected===t.id?<Check size={18}/>:<ArrowRight size={18}/>}</button>)}{!list.length&&<p className="sp-empty">এই collection-এ এখনো কোনো Speaking test নেই।</p>}</div>
  <aside className="study-speaking-brief" aria-live="polite"><Mic2 size={29}/><h3>{current?name(current.title):'Choose a test'}</h3><p>{current?'Listen to the examiner, record your answers, then get feedback.':'বাম পাশ থেকে একটা test বেছে নাও।'}</p><div><span><Clock3 size={15}/>{current?`${current.minutes} minutes`:'Your own pace'}</span><span><Headphones size={15}/>Listen, record, review</span></div>{current&&<SpeakingStart key={current.id} testId={current.id}/>}<small>Evaluation uses your Speaking allowance.</small></aside>
 </div>
 <CustomSpeaking/>
 </section>;
}
