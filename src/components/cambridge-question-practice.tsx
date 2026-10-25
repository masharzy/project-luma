'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import { BookOpenText, Headphones, LockKeyhole, Layers3, Shuffle, ArrowUpRight, LoaderCircle, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import { QuestionPagePreview } from './question-page-preview';
import { MAX_PRACTICE_QUESTIONS, questionTypeLabel } from '@/lib/exam/question-types';

type ModuleChoice='all'|'listening'|'reading';
type Kind={type:string;label:string;total:number;free:number;premium:number};
type Question={key?:string;module:'listening'|'reading';type:string;book:number;test:number;number:string;preview:string;premium:boolean;previewKey?:string};
type Catalog={types:Kind[];items:Question[];total:number;free:number;premium:number;page:number;hasMore:boolean};

export function CambridgeQuestionPractice(){const [open,setOpen]=useState(false);return <details className="question-practice-disclosure" onToggle={e=>setOpen(e.currentTarget.open)}><summary><span><strong>Practise by question type</strong><small>Listening & Reading · choose specific questions or a mixed set</small></span><span className="question-practice-toggle">{open?'Close −':'Explore +'}</span></summary>{open&&<QuestionPracticePanel/>}</details>;}
function QuestionPracticePanel(){
 const [module,setModule]=useState<ModuleChoice>('all');
 const [selected,setSelected]=useState<string[]>([]);
 const [count,setCount]=useState(10);
 const [picked,setPicked]=useState<string[]>([]);
 const [catalog,setCatalog]=useState<Catalog|null>(null);
 const [questions,setQuestions]=useState<Question[]>([]);
 const [page,setPage]=useState(0),[loading,setLoading]=useState(true),[starting,setStarting]=useState(false),[error,setError]=useState('');
 const query=useCallback((p:number)=>{
   const args=new URLSearchParams({module,page:String(p)});
   if(selected.length)args.set('types',selected.join(','));
   return '/api/cambridge/question-types?'+args;
 },[module,selected]);
 const latestQuery=useRef(query(0));latestQuery.current=query(0);
 useEffect(()=>{
   let alive=true;
   setLoading(true);
   setError('');
   void (async()=>{
     try{
       const response=await fetch(query(0),{cache:'no-store'});
       const data=await response.json();
       if(!response.ok)throw Error(data.error||'Unable to load question bank.');
       if(!alive)return;
       setCatalog(data);setQuestions(data.items);setPage(0);setCount(v=>Math.min(v,Math.max(1,data.free)));
     }catch(e){if(alive){setError(e instanceof Error?e.message:'Unable to load questions.');setCatalog(null);setQuestions([]);}}
     finally{if(alive)setLoading(false);}
   })();
   return()=>{alive=false;};
 },[query]);
 const loadMore=async()=>{
   if(loading||!catalog?.hasMore)return;
   setLoading(true);const activeQuery=query(0);
   try{
     const response=await fetch(query(page+1),{cache:'no-store'});
     const data=await response.json();
     if(!response.ok)throw Error(data.error||'Unable to load more questions.');
     if(latestQuery.current!==activeQuery)return;
     setQuestions(v=>[...v,...data.items]);setPage(page+1);
     setCatalog(data);
   }catch(e){setError(e instanceof Error?e.message:'Unable to load more questions.');}
   finally{setLoading(false);}
 };
 const start=async(only?:string[])=>{
   const keys=only||picked;const size=keys.length||count;
   if(starting||loading||!catalog||size>catalog.free)return;
   setStarting(true);setError('');
   try{
     const response=await fetch('/api/cambridge/question-types',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({modules:module==='all'?['listening','reading']:[module],types:selected,count:size,...(keys.length?{keys}: {})}),
     });
     const data=await response.json();
     if(!response.ok)throw Error(data.error||'Unable to start this practice.');
     window.location.assign(data.url);
   }catch(e){setError(e instanceof Error?e.message:'Unable to start practice.');setStarting(false);}
 };
 const changeType=(type:string)=>{
   setPicked([]);setSelected(v=>v.includes(type)?v.filter(t=>t!==type):[...v,type]);
 };
 const enough=Boolean(catalog && catalog.free>=(picked.length||count));
 return <section className="cambridge-type-practice" id="question-type-practice" aria-labelledby="type-practice-heading">
   <div className="type-practice-intro">
     <div><span className="session-eyebrow">SMART PRACTICE · CAMBRIDGE QUESTION BANK</span>
     <h2 id="type-practice-heading">Practice by question type.</h2>
     <p>Filter a type, preview the page, then tick the questions you want. Or choose a count for a random set.</p></div>
     <div className="type-practice-icon" aria-hidden><Layers3 size={31}/></div>
   </div>
   <div className="type-practice-controls">
     <div className="type-practice-field">
       <span className="type-field-title"><SlidersHorizontal size={16}/> Module</span>
       <div className="type-module-tabs" aria-label="Filter question bank by module">
         {([['all','All modules'],['listening','Listening'],['reading','Reading']] as const).map(([value,label])=>
           <button key={value} type="button" aria-pressed={module===value} onClick={()=>{setModule(value);setSelected([]);setPicked([]);}}>{value==='listening'?<Headphones size={16}/>:value==='reading'?<BookOpenText size={16}/>:<Layers3 size={16}/>} {label}</button>)}
       </div>
     </div>
     <div className="type-practice-field">
       <span className="type-field-title"><CheckCircle2 size={16}/> Question types <small>Multiple selections allowed</small></span>
       <p className="type-list-hint">Scroll for more types. You can choose more than one.</p><div className="type-tags" aria-label="Question types">
         <button type="button" className="type-tag" aria-pressed={selected.length===0} onClick={()=>{setSelected([]);setPicked([]);}}>All types</button>
         {catalog?.types.map(t=><button type="button" key={t.type} className="type-tag" aria-pressed={selected.includes(t.type)} onClick={()=>changeType(t.type)}>
           {t.label}<span>{t.total===0?'Not added yet':t.free+' free'}{t.premium>0?' · '+t.premium+' locked':''}</span>
         </button>)}
         {!catalog && loading && <span className="type-loading-inline">Finding question types…</span>}
       </div>
     </div>
     <div className="type-practice-start">
       <div><label className="type-field-title" htmlFor="type-question-count">Number of questions</label>
         <input id="type-question-count" type="number" min={1} max={MAX_PRACTICE_QUESTIONS} disabled={picked.length>0} value={count} onChange={e=>setCount(Math.max(1,Math.min(MAX_PRACTICE_QUESTIONS,Number(e.target.value)||1)))}/>
         <p>{picked.length?picked.length+' questions selected below.':'No specific selection: a random set will be created.'}</p>
       </div>
       <div className="type-practice-start-action">
         <span>{catalog? <><strong>{catalog.free}</strong> free questions available · <strong>{catalog.premium}</strong> premium locked</>:'Loading availability…'}</span>
         <button type="button" className="type-start-button" onClick={()=>void start()} disabled={starting||loading||!enough}>
           {starting?<LoaderCircle className="type-spin" size={18}/>:<Shuffle size={18}/>}
           {starting?'Preparing session…':picked.length?'Practise selected ('+picked.length+')':'Start random practice'}<ArrowUpRight size={17}/>
         </button>
         {catalog&&!enough&&<small className="type-count-warning">Only {catalog.free} free questions match your selection. Select a smaller number or another type.</small>}
       </div>
     </div>
   </div>
   <div className="type-practice-library">
     <div className="type-library-heading">
       <div><span className="session-eyebrow">QUESTION EXPLORER</span><h3>{selected.length===1?questionTypeLabel(selected[0]):selected.length>1?selected.length+' selected question types':'All question types'}</h3></div>
       <span>{catalog?.total ?? 0} questions · {questions.length} shown</span>
     </div>
     {picked.length>0&&<div className="type-selection-bar" role="status"><strong>{picked.length} / 40 selected</strong><button type="button" onClick={()=>setPicked([])}>Clear selection</button></div>}
     <div className="type-question-grid" aria-busy={loading}>
       {questions.map((item,index)=>
         <article key={item.key||['premium',item.book,item.test,item.module,item.number,item.type,index].join('-')} className={'type-question-card '+(item.premium?'is-locked':'')}>
           <div className="type-question-meta"><span>{item.module==='listening'?<Headphones size={15}/>:<BookOpenText size={15}/>} {item.module}</span>
             <span>Cambridge {item.book} · Test {item.test} · Q {item.number}</span></div>
           <h4>{questionTypeLabel(item.type)}</h4>
           {!item.premium&&item.key&&<label className="type-question-select"><input type="checkbox" checked={picked.includes(item.key)} disabled={!picked.includes(item.key)&&picked.length>=40} onChange={()=>setPicked(v=>v.includes(item.key!)?v.filter(k=>k!==item.key):[...v,item.key!])}/>Select question {item.number}</label>}
           {item.premium
             ? <div className="type-locked-content" aria-label="Premium question locked"><div className="type-locked-blur" aria-hidden><i/><i/><i/></div><div className="type-locked-overlay"><LockKeyhole size={20}/><strong>Premium question</strong><span>Question content locked</span></div></div>
             : <><QuestionPagePreview previewKey={item.previewKey||item.key!}/><button type="button" className="type-practise-one" disabled={starting||loading} onClick={()=>void start([item.key!])}>Practise this question ↗</button></>}
           <div className="type-question-footer"><span>{item.premium?<><LockKeyhole size={14}/> Locked</>:<><CheckCircle2 size={14}/> Included in free pool</>}</span><span>{item.premium?'Premium':'Practice ready'}</span></div>
         </article>)}
     </div>
     {!loading&&!questions.length&&!error&&<p className="type-empty">There are no published questions for these filters yet. Try another type or module.</p>}
     {error&&<p className="type-error" role="alert">{error}</p>}
     {catalog?.hasMore&&<button type="button" className="type-load-more" disabled={loading} onClick={()=>void loadMore()}>{loading?'Loading questions…':'Load more questions ↓'}</button>}
     {picked.length>0&&<div className="type-mobile-selection"><strong>{picked.length} selected</strong><button className="type-start-button" type="button" disabled={starting||loading} onClick={()=>void start()}>Start selected questions ↗</button></div>}
     <p className="type-practice-footnote"><LockKeyhole size={15}/> Locked questions require Premium. Choose up to 40 free questions; scores appear after submission.</p>
   </div>
 </section>;
}
