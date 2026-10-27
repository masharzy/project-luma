'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import { BookOpenText, Headphones, LockKeyhole, Layers3, Shuffle, ArrowUpRight, LoaderCircle, SlidersHorizontal, CheckCircle2, Check, X } from 'lucide-react';
import { usePracticeSelection } from './practice-selection-provider';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const QuestionPagePreview=dynamic(()=>import('./question-page-preview').then(m=>m.QuestionPagePreview));
import { questionTypeLabel } from '@/lib/exam/question-types';

type ModuleChoice='all'|'listening'|'reading';
type Kind={type:string;label:string;total:number;free:number;premium:number};
type Question={sourceLabel?:string;key?:string;module:'listening'|'reading';type:string;book:number;test:number;number:string;preview:string;premium:boolean;previewKey?:string;questionCount:number};
type Catalog={types:Kind[];items:Question[];total:number;free:number;premium:number;page:number;hasMore:boolean};

type BankProps={collection?:'all'|'cambridge'|'other-books'|'practice';book?:string;series?:string};
export function CambridgeQuestionPractice({collection='cambridge',book,series}:BankProps){
 const args=new URLSearchParams({view:'questions',collection});if(book)args.set('book',book);if(series)args.set('series',series);
 return <p className="question-practice-shortcut"><Link href={'/practice?'+args}>Practise by question type ↗</Link></p>;
}
export function QuestionPracticePanel({collection='all',book,series}:BankProps){
 const selection=usePracticeSelection();
 const picked=selection.items.map(g=>g.key);
 const [module,setModule]=useState<ModuleChoice>('listening');
 const [selected,setSelected]=useState<string[]>([]);
 const [manual,setManual]=useState(false);
 const [count,setCount]=useState(1);
 const [catalog,setCatalog]=useState<Catalog|null>(null);
 const [questions,setQuestions]=useState<Question[]>([]);
 const [page,setPage]=useState(0),[loading,setLoading]=useState(true),[starting,setStarting]=useState(false),[error,setError]=useState('');
 const query=useCallback((p:number)=>{
   const args=new URLSearchParams({module,page:String(p),collection});
   if(book)args.set("book",book);if(series)args.set("series",series);
   if(selected.length)args.set('types',selected.join(','));
   return '/api/practice/question-types?'+args;
 },[module,selected,collection,book,series]);
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
   const size=count;
   if(starting||loading||!catalog||size>catalog.free)return;
   setStarting(true);setError('');
   try{
     const response=await fetch('/api/practice/question-types',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({collection,book,series,modules:module==='all'?['listening','reading']:[module],types:selected,selectionMode:'groups',count:size}),
     });
     const data=await response.json();
     if(!response.ok)throw Error(data.error||'Unable to start this practice.');
     window.location.assign(data.url);
   }catch(e){setError(e instanceof Error?e.message:'Unable to start practice.');setStarting(false);}
 };
 const selectedQuestionCount=selection.items.reduce((n,q)=>n+q.questionCount,0);
 const enough=Boolean(catalog && catalog.free>=count);
 return <section className="cambridge-type-practice" id="question-type-practice" aria-label="Question type practice">
   <div className="simple-question-controls">
    <fieldset><legend>1. Module</legend><div className="type-module-tabs">{([['listening','Listening'],['reading','Reading']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={module===value} onClick={()=>{setModule(value);setSelected([]);}}>{value==='listening'?<Headphones size={16}/>:<BookOpenText size={16}/>} {label}</button>)}</div></fieldset>
    <label className="simple-question-type">2. Question type<select value={selected[0]||''} disabled={loading} onChange={e=>setSelected(e.target.value?[e.target.value]:[])}><option value="">All question types</option>{catalog?.types.filter(t=>t.total>0).map(t=><option key={t.type} value={t.type}>{t.label}</option>)}</select></label>
    <div className="simple-question-action"><button type="button" className="type-start-button" onClick={()=>void start()} disabled={starting||loading||!enough||selection.busy}>{starting?<LoaderCircle className="type-spin" size={18}/>:<ArrowUpRight size={18}/>} {starting?'Preparing…':'Start practice'}</button><small>{loading?'Finding questions…':catalog?.free?`${catalog.free} practice sets available`:'No free questions match this choice.'}</small></div>
   </div>
   {error&&<p className="type-error" role="alert">{error}</p>}
   <details className="question-session-options"><summary>Session options</summary><label htmlFor="type-question-count">Practice sets in this session<input id="type-question-count" type="number" min={1} max={Math.min(10,catalog?.free||1)} disabled={starting||selection.busy} value={count} onChange={e=>setCount(Math.max(1,Math.min(10,Number(e.target.value)||1)))}/></label><p>Related questions stay together. Each session contains up to 40 questions.</p><nav aria-label="Question sources"><Link href="/practice?view=questions">All collections</Link><Link href="/practice?view=questions&collection=cambridge">Cambridge</Link><Link href="/practice?view=questions&collection=other-books">Other Books</Link><Link href="/practice?view=questions&collection=practice">Practice tests</Link></nav>{catalog&&!enough&&<p role="status">Choose fewer practice sets for these filters.</p>}</details>
   <details className="manual-question-choice" onToggle={e=>setManual(e.currentTarget.open)}><summary>Choose questions yourself</summary>
   {manual&&<div className="type-practice-library">

     <div className="type-library-heading">
       <div><span className="session-eyebrow">QUESTION EXPLORER</span><h3>{selected.length===1?questionTypeLabel(selected[0]):selected.length>1?selected.length+' selected question types':'All question types'}</h3></div>
       <span>{catalog?.total ?? 0} groups · {questions.length} shown</span>
     </div>
     <div className="type-question-grid" aria-busy={loading}>
       {questions.map((item,index)=>{const checked=Boolean(item.key&&picked.includes(item.key));const capped=selection.busy||(!checked&&(picked.length>=10||selectedQuestionCount+item.questionCount>40));return <article key={item.key||['premium',item.book,item.test,item.module,item.number,item.type,index].join('-')} className={'type-question-card '+(item.premium?'is-locked':'')+(checked?' is-selected':'')}>
         {!item.premium&&item.key&&<><input className="type-card-selector" type="checkbox" aria-label={'Select '+questionTypeLabel(item.type)+', '+(item.sourceLabel||'Cambridge '+item.book+' · Test '+item.test)+', questions '+item.number} checked={checked} disabled={capped} onChange={()=>selection.toggle({key:item.key!,module:item.module,questionCount:item.questionCount,sourceLabel:(item.sourceLabel||`Cambridge ${item.book} · Test ${item.test}`).slice(0,220),number:item.number.slice(0,100),type:item.type})}/><span className="type-card-checkbox" aria-hidden="true">{checked&&<Check size={14} strokeWidth={3}/>}</span></>}
         <div className="type-card-heading"><span aria-hidden="true">{item.module==='listening'?<Headphones size={14}/>:<BookOpenText size={14}/>}</span><h4>{questionTypeLabel(item.type)}</h4></div>
         <p className="type-card-caption">{item.sourceLabel||`Cambridge ${item.book} · Test ${item.test}`} · Q {item.number}<span>{item.questionCount} questions</span></p>
         {item.premium?<div className="type-locked-content" aria-label="Premium question locked"><div className="type-locked-blur" aria-hidden="true"><i/><i/><i/></div><div className="type-locked-overlay"><LockKeyhole size={20}/><strong>Premium</strong></div></div>:<QuestionPagePreview endpoint="/api/practice/question-types" previewKey={item.previewKey||item.key!}/>}
       </article>;})}
     </div>
     {!loading&&!questions.length&&!error&&<p className="type-empty">There are no published questions for these filters yet. Try another type or module.</p>}
     {catalog?.hasMore&&<button type="button" className="type-load-more" disabled={loading} onClick={()=>void loadMore()}>{loading?'Loading questions…':'Load more questions ↓'}</button>}
     <p className="type-practice-footnote"><LockKeyhole size={15}/> Locked questions require Premium. Choose complete free groups (up to 40 questions); every field in a selected group is included.</p>
   </div>}
   </details>
 </section>;
}
