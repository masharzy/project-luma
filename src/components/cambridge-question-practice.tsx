'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import { BookOpenText, Headphones, LockKeyhole, Layers3, Shuffle, ArrowUpRight, LoaderCircle, SlidersHorizontal, CheckCircle2, Check, X } from 'lucide-react';
import { QuestionPagePreview } from './question-page-preview';
import { questionTypeLabel } from '@/lib/exam/question-types';

type ModuleChoice='all'|'listening'|'reading';
type Kind={type:string;label:string;total:number;free:number;premium:number};
type Question={key?:string;module:'listening'|'reading';type:string;book:number;test:number;number:string;preview:string;premium:boolean;previewKey?:string;questionCount:number};
type Catalog={types:Kind[];items:Question[];total:number;free:number;premium:number;page:number;hasMore:boolean};

export function CambridgeQuestionPractice(){const [open,setOpen]=useState(false);return <details className="question-practice-disclosure" onToggle={e=>setOpen(e.currentTarget.open)}><summary><span><strong>Practise by question type</strong><small>Listening & Reading · choose complete question groups</small></span><span className="question-practice-toggle">{open?'Close −':'Explore +'}</span></summary>{open&&<QuestionPracticePanel/>}</details>;}
function QuestionPracticePanel(){
 const [module,setModule]=useState<ModuleChoice>('all');
 const [selected,setSelected]=useState<string[]>([]);
 const [count,setCount]=useState(1);
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
 const start=async()=>{
   const keys=picked;const size=keys.length||count;
   if(starting||loading||!catalog||size>catalog.free)return;
   setStarting(true);setError('');
   try{
     const response=await fetch('/api/cambridge/question-types',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({modules:module==='all'?['listening','reading']:[module],types:selected,selectionMode:'groups',count:size,...(keys.length?{keys}: {})}),
     });
     const data=await response.json();
     if(!response.ok)throw Error(data.error||'Unable to start this practice.');
     window.location.assign(data.url);
   }catch(e){setError(e instanceof Error?e.message:'Unable to start practice.');setStarting(false);}
 };
 const changeType=(type:string)=>{
   setPicked([]);setSelected(v=>v.includes(type)?v.filter(t=>t!==type):[...v,type]);
 };
 const selectedQuestionCount=questions.filter(q=>q.key&&picked.includes(q.key)).reduce((n,q)=>n+q.questionCount,0);
 const enough=Boolean(catalog && catalog.free>=(picked.length||count)&&selectedQuestionCount<=40);
 return <section className="cambridge-type-practice" id="question-type-practice" aria-label="Question type practice">
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
       <div><label className="type-field-title" htmlFor="type-question-count">Number of groups</label>
         <input id="type-question-count" type="number" min={1} max={10} disabled={picked.length>0} value={count} onChange={e=>setCount(Math.max(1,Math.min(10,Number(e.target.value)||1)))}/>
         <p>Random complete groups · up to 40 questions; no group is split.</p>
       </div>
       <div className="type-practice-start-action">
         <span>{catalog? <><strong>{catalog.free}</strong> free groups available · <strong>{catalog.premium}</strong> premium locked</>:'Loading availability…'}</span>
         <button type="button" className="type-start-button" onClick={()=>void start()} disabled={starting||loading||!enough||picked.length>0}>
           {starting?<LoaderCircle className="type-spin" size={18}/>:<Shuffle size={18}/>}
           {starting?'Preparing session…':'Start random practice'}<ArrowUpRight size={17}/>
         </button>
         {catalog&&!enough&&<small className="type-count-warning">Only {catalog.free} free groups match your selection. Select a smaller number or another type.</small>}
       </div>
     </div>
   </div>
   <div className="type-practice-library">
     <div className="type-library-heading">
       <div><span className="session-eyebrow">QUESTION EXPLORER</span><h3>{selected.length===1?questionTypeLabel(selected[0]):selected.length>1?selected.length+' selected question types':'All question types'}</h3></div>
       <span>{catalog?.total ?? 0} groups · {questions.length} shown</span>
     </div>
     <div className="type-question-grid" aria-busy={loading}>
       {questions.map((item,index)=>{const checked=Boolean(item.key&&picked.includes(item.key));const capped=!checked&&(picked.length>=10||selectedQuestionCount+item.questionCount>40);return <article key={item.key||['premium',item.book,item.test,item.module,item.number,item.type,index].join('-')} className={'type-question-card '+(item.premium?'is-locked':'')+(checked?' is-selected':'')}>
         {!item.premium&&item.key&&<><input className="type-card-selector" type="checkbox" aria-label={'Select '+questionTypeLabel(item.type)+', Cambridge '+item.book+', Test '+item.test+', questions '+item.number} checked={checked} disabled={capped} onChange={()=>setPicked(v=>v.includes(item.key!)?v.filter(k=>k!==item.key):[...v,item.key!])}/><span className="type-card-checkbox" aria-hidden="true">{checked&&<Check size={14} strokeWidth={3}/>}</span></>}
         <div className="type-card-heading"><span aria-hidden="true">{item.module==='listening'?<Headphones size={14}/>:<BookOpenText size={14}/>}</span><h4>{questionTypeLabel(item.type)}</h4></div>
         <p className="type-card-caption">Cambridge {item.book} · Test {item.test} · Q {item.number}<span>{item.questionCount} questions</span></p>
         {item.premium?<div className="type-locked-content" aria-label="Premium question locked"><div className="type-locked-blur" aria-hidden="true"><i/><i/><i/></div><div className="type-locked-overlay"><LockKeyhole size={20}/><strong>Premium</strong></div></div>:<QuestionPagePreview previewKey={item.previewKey||item.key!}/>}
       </article>;})}
     </div>
     {!loading&&!questions.length&&!error&&<p className="type-empty">There are no published questions for these filters yet. Try another type or module.</p>}
     {error&&<p className="type-error" role="alert">{error}</p>}
     {catalog?.hasMore&&<button type="button" className="type-load-more" disabled={loading} onClick={()=>void loadMore()}>{loading?'Loading questions…':'Load more questions ↓'}</button>}
     <div className={'type-floating-selection'+(picked.length?' is-visible':'')} inert={!picked.length} aria-hidden={!picked.length} role="region" aria-label="Selected practice">
       <div><strong key={picked.length} className="type-floating-count">{picked.length} selected</strong><small>{selectedQuestionCount} questions</small></div>
       <button className="type-start-button" type="button" disabled={starting||loading||!enough} onClick={()=>void start()}>{starting?<LoaderCircle className="type-spin" size={16}/>:null}{starting?'Preparing…':'Start this Practice'}<ArrowUpRight size={16}/></button>
       <button className="type-floating-clear" type="button" aria-label="Clear selection" onClick={()=>setPicked([])}><X size={18}/></button>
     </div>
     <span className="type-selection-status" role="status" aria-live="polite">{picked.length?picked.length+' selected, '+selectedQuestionCount+' questions':''}</span>
     <p className="type-practice-footnote"><LockKeyhole size={15}/> Locked questions require Premium. Choose complete free groups (up to 40 questions); every field in a selected group is included.</p>
   </div>
 </section>;
}
