'use client';
import {useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,Headphones,Mic2,Clock3} from 'lucide-react';
import {SpeakingStart} from './speaking-start';
import {speakingBook} from '@/lib/learner/results';
import {availableSpeakingCollections,speakingSource,type SpeakingChoice} from '@/lib/learner/speaking-collections';
import {CustomSpeaking} from './custom-speaking';
export function SpeakingPicker({tests}:{tests:SpeakingChoice[]}){
 const collections=availableSpeakingCollections(tests);
 const [step,setStep]=useState(0),[series,setSeries]=useState(''),[book,setBook]=useState(''),[selected,setSelected]=useState('');
 const matching=useMemo(()=>tests.filter(t=>(t.collectionKey||speakingSource(t.title).collectionKey)===series),[tests,series]);
 const books=[...new Set(matching.map(t=>(t.bookLabel||speakingBook(t.title))))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
 const current=tests.find(t=>t.id===selected);
 return <section className="speaking-studio"><div className="study-stepper" aria-label="Speaking setup steps">{['Collection','Book','Test & start'].map((label,i)=><button key={label} disabled={i>step} aria-current={i===step?'step':undefined} onClick={()=>setStep(i)}><span>{i<step?<Check size={14}/>:i+1}</span><strong>{label}</strong></button>)}</div>
 <nav className="sp-crumbs" aria-label="Your selection"><span>Speaking</span>{series&&<><span aria-hidden>›</span><span>{collections.find(c=>c.key===series)?.label}</span></>}{book&&<><span aria-hidden>›</span><span>{book}</span></>}{current&&<><span aria-hidden>›</span><strong>{current.title.replace(/\s*·\s*Speaking$/,'')}</strong></>}</nav>
 <div className="study-stage-heading"><div><span className="study-kicker">STEP {step+1} OF 3</span><h2>{step===0?'Choose your collection':step===1?'Find your next chapter':'Meet your next test'}</h2></div>{step>0&&<button className="study-text-button" onClick={()=>setStep(step-1)}><ArrowLeft size={15}/> Back</button>}</div>
 {step===0&&<div className="study-collections">{collections.map((c,i)=>{const count=c.count;return <button className="study-collection-card" key={c.key} onClick={()=>{setSeries(c.key);setBook('');setSelected('');setStep(1);}}><span className="study-collection-number">{String(i+1).padStart(2,'0')}</span><BookOpen size={28}/><h3>{c.label}</h3><footer><span>{count?`${count} tests`:'Not published yet'}</span><ArrowRight size={17}/></footer></button>})}</div>}
 {step===1&&<div className="study-book-grid">{books.map((b,i)=><button className="study-book-choice" key={b} onClick={()=>{setBook(b);setSelected('');setStep(2);}}><span>{String(i+1).padStart(2,'0')}</span><div><h3>{b}</h3><p>{matching.filter(t=>(t.bookLabel||speakingBook(t.title))===b).length} Speaking tests</p></div><ArrowRight size={17}/></button>)}</div>}
 {step===2&&<div className="study-speaking-setup"><div className="study-speaking-tests">{matching.filter(t=>(t.bookLabel||speakingBook(t.title))===book).sort((a,b)=>a.title.localeCompare(b.title,undefined,{numeric:true})).map(t=><button key={t.id} aria-pressed={selected===t.id} onClick={()=>setSelected(t.id)}><span className="study-round-icon"><Headphones size={20}/></span><div><h3>{t.title.replace(/\s*·\s*Speaking$/,'')}</h3><p>{t.parts} parts · {t.minutes} minutes</p></div>{selected===t.id?<Check size={18}/>:<ArrowRight size={18}/>}</button>)}</div><aside className="study-speaking-brief"><Mic2 size={29}/><span className="study-kicker">SPEAKING</span><h3>{current?'Ready when you are.':'Choose a test.'}</h3><p>{current?current.title:'Select a test on the left.'}</p><div><span><Clock3 size={15}/>{current?`${current.minutes} minutes`:'Your own pace'}</span><span><Headphones size={15}/>Listen, record, review</span></div>{current&&<SpeakingStart key={current.id} testId={current.id}/>}<small>Evaluation uses your Speaking allowance.</small></aside></div>}
 <CustomSpeaking/>
 </section>;
}
