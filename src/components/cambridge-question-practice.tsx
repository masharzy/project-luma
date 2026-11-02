'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import { BookOpenText, Headphones, LockKeyhole, Layers3, ArrowUpRight, Check, X } from 'lucide-react';
import { usePracticeSelection } from './practice-selection-provider';
import Link from 'next/link';
import {QuestionPagePreview} from './question-page-preview';
import { questionTypeLabel } from '@/lib/exam/question-types';

type ModuleChoice='all'|'listening'|'reading';
type Kind={type:string;label:string;total:number;free:number;premium:number};
type Question={sourceLabel?:string;key?:string;module:'listening'|'reading';type:string;book:number;test:number;number:string;preview:string;premium:boolean;previewKey?:string;questionCount:number};
type Catalog={types:Kind[];items:Question[];total:number;free:number;premium:number;page:number;hasMore:boolean};

type BankProps={collection?:'all'|'cambridge'|'other-books'|'practice'|'recent-tests';book?:string;series?:string};
export function CambridgeQuestionPractice({collection='cambridge',book,series}:BankProps){
 const args=new URLSearchParams({collection:collection==='practice'?'recent-tests':collection});if(book)args.set('book',book);if(series)args.set('series',series);
 return <p className="question-practice-shortcut"><Link href={'/recent-tests?view=questions&'+args}>Type Wise Question Practice ↗</Link></p>;
}
export function QuestionPracticePanel({collection='all',book,series}:BankProps){
 const selection=usePracticeSelection();
 const [source,setSource]=useState(collection==='practice'?'recent-tests':collection);
 const scopedBook=source===(collection==='practice'?'recent-tests':collection)?book:undefined;
 const scopedSeries=source===(collection==='practice'?'recent-tests':collection)?series:undefined;
 const picked=selection.items.map(g=>g.key);
 const [module,setModule]=useState<ModuleChoice>('listening');
 const [selected,setSelected]=useState<string[]>([]);
 const [manual,setManual]=useState(true);
 const [count,setCount]=useState(1);
 const [catalog,setCatalog]=useState<Catalog|null>(null);
 const [questions,setQuestions]=useState<Question[]>([]);
 const [page,setPage]=useState(0),[loading,setLoading]=useState(true),[starting,setStarting]=useState(false),[error,setError]=useState('');
 const query=useCallback((p:number)=>{
   const args=new URLSearchParams({module,page:String(p),collection:source});
   if(scopedBook)args.set("book",scopedBook);if(scopedSeries)args.set("series",scopedSeries);
   if(selected.length)args.set('types',selected.join(','));
   return '/api/type-wise-question-practice?'+args;
 },[module,selected,source,scopedBook,scopedSeries]);
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
   finally{if(latestQuery.current===activeQuery)setLoading(false);}
 };
 const start=async()=>{
   const size=count;
   if(starting||loading||!catalog||size>catalog.free)return;
   setStarting(true);setError('');
   try{
     const response=await fetch('/api/type-wise-question-practice',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({collection:source,book:scopedBook,series:scopedSeries,modules:module==='all'?['listening','reading']:[module],types:selected,selectionMode:'groups',count:size}),
     });
     const data=await response.json();
     if(!response.ok)throw Error(data.error||'Unable to start this practice.');
     window.location.assign(data.url);
   }catch(e){setError(e instanceof Error?e.message:'Unable to start practice.');setStarting(false);}
 };
 const selectedQuestionCount=selection.items.reduce((n,q)=>n+q.questionCount,0);
 const enough=Boolean(catalog && catalog.free>=count);

 const activeCollection=source;
 const pick=(item:Question,label:string)=>{if(!item.key)return;selection.toggle({key:item.key,module:item.module,questionCount:item.questionCount,sourceLabel:label.slice(0,220),number:item.number.slice(0,100),type:item.type});};
 return <section className="typewise-practice" aria-label="Type Wise Question Practice">
  <div className="typewise-topbar"><div className="typewise-module-switch" role="group" aria-label="Choose a module">{([['listening','Listening'],['reading','Reading']] as const).map(([value,label])=><button key={value} aria-pressed={module===value} onClick={()=>{setModule(value);setSelected([]);}}>{value==='listening'?<Headphones size={19}/>:<BookOpenText size={19}/>}<span>{label}</span><small>{value==='listening'?'Listen with purpose':'Read with focus'}</small></button>)}</div><div className="typewise-modes" role="group" aria-label="Session mode"><button aria-pressed={!manual} onClick={()=>setManual(false)}>Auto-pick sets</button><button aria-pressed={manual} onClick={()=>setManual(true)}>Select questions</button></div></div>
  <nav className="typewise-sources" aria-label="Question sources">{[['all','All collections'],['cambridge','Cambridge'],['other-books','More Books'],['recent-tests','Recent Tests']].map(([key,label])=><button key={key} type="button" onClick={()=>{setSource(key as typeof source);}} aria-pressed={activeCollection===key}>{label}</button>)}{(scopedBook||scopedSeries)&&<span>{scopedBook?'Book '+scopedBook:scopedSeries}</span>}</nav>
  <div className="typewise-layout"><div className="typewise-main"><section className="typewise-types"><header><div><span className="typewise-kicker">01 / YOUR FOCUS</span><h2>Filter by question type</h2><p>একাধিক type বাছতে পারো। একটি card হলো একটি question set—সেটের সব প্রশ্ন একসঙ্গে select হবে।</p></div>{selected.length>0&&<button className="typewise-clear" onClick={()=>setSelected([])}>Clear types <X size={13}/></button>}</header>
   <div className="typewise-type-grid" aria-busy={loading}>{loading&&!catalog?Array.from({length:6},(_,i)=><div className="typewise-skeleton" aria-hidden="true" key={i}/>):catalog?.types.filter(t=>t.total>0).map(t=><button className="typewise-type" key={t.type} aria-pressed={selected.includes(t.type)} onClick={()=>setSelected(v=>v.includes(t.type)?v.filter(type=>type!==t.type):[...v,t.type])}><span className="typewise-check">{selected.includes(t.type)?<Check size={13}/>:<Layers3 size={15}/>}</span><strong>{t.label}</strong><span className="typewise-type-meta"><b>{t.free}</b> free sets{t.premium>0&&<small><LockKeyhole size={10}/>{t.premium} Premium</small>}</span></button>)}</div>
   {!loading&&!catalog?.types.some(t=>t.total>0)&&!error&&<p className="typewise-note">এই collection-এ এখনো published questions নেই। অন্য collection বেছে দেখো।</p>}
  </section>
  {manual&&picked.length>0&&<details className="typewise-picked"><summary>{picked.length} sets selected · {selectedQuestionCount} questions</summary><ul>{selection.items.map(item=><li key={item.key}><div><strong>{item.sourceLabel}</strong><span>{item.module} · Q {item.number} · {item.questionCount} questions</span></div><button aria-label={'Remove '+item.sourceLabel+', Q '+item.number} onClick={()=>selection.toggle(item)} disabled={selection.busy}><X size={16}/></button></li>)}</ul></details>}
  {!manual&&<label className="typewise-auto-size">How many question sets?<input aria-label="Number of question sets" type="number" min={1} max={catalog?.free||1} value={count} onChange={e=>setCount(Math.max(1,Math.min(catalog?.free||1,Number(e.target.value)||1)))}/><span>{catalog?.free||0} free sets available. প্রতিটি set-এ একাধিক প্রশ্ন থাকতে পারে।</span></label>}
  {manual&&<section className="typewise-explorer"><header><div><span className="typewise-kicker">02 / MAKE IT YOURS</span><h2>Select your questions</h2></div><span>{catalog?.total||0} sets · {questions.length} shown</span></header><p className="typewise-loading" role="status">{loading?'প্রশ্নগুলো আপডেট হচ্ছে…':'Free sets বেছে নাও। Premium sets-এ lock চিহ্ন আছে।'}</p><div className="typewise-question-grid" aria-busy={loading}>{questions.map((item,index)=>{const checked=Boolean(item.key&&picked.includes(item.key));const capped=selection.busy;const label=(item.sourceLabel||`Cambridge ${item.book} · Test ${item.test}`);return item.premium?<article className="typewise-question locked" key={'locked-'+index}><span className="typewise-kicker">{item.module}</span><h3 className="typewise-source-title">{label}</h3><p>{questionTypeLabel(item.type)} · Q {item.number}</p><div><LockKeyhole size={21}/><strong>Premium set</strong><span>Question content stays locked.</span></div><Link href="/pricing">Explore plans ↗</Link></article>:<button className="typewise-question" key={item.key} aria-pressed={checked} disabled={capped} onClick={()=>pick(item,label)}><header><span className="typewise-kicker">{item.module}</span><span className="typewise-pick-indicator">{checked?<span>✓ Selected</span>:<span>Select</span>}</span></header><h3 className="typewise-source-title">{label}</h3><p className="typewise-question-type">{questionTypeLabel(item.type)} · Q {item.number} · {item.questionCount} questions in this set</p><QuestionPagePreview previewKey={item.previewKey||item.key!} endpoint="/api/type-wise-question-practice"/><footer><span>Q {item.number}</span><strong>{item.questionCount} questions</strong></footer></button>})}</div>{!loading&&!questions.length&&!error&&<p className="typewise-note">No sets match these filters. Try another question type.</p>}{catalog?.hasMore&&<button className="typewise-more" disabled={loading} onClick={()=>void loadMore()}>{loading?'Loading…':'Show more sets'} <ArrowUpRight size={14}/></button>}</section>}
  </div></div>
  <div className="typewise-actionbar" aria-label="Practice session controls"><div><strong>{manual?`${selectedQuestionCount} questions`:`${count} sets · auto-pick`}</strong><span>{manual?`${picked.length} sets selected`:'নির্বাচিত type থেকে প্রশ্ন নেওয়া হবে'}</span></div>{manual&&picked.length>0&&<button className="typewise-clear" onClick={()=>{selection.clear();}}>Clear selection</button>}<button className="typewise-start" disabled={manual?!picked.length||selection.busy:starting||loading||!enough||selection.busy} onClick={()=>manual?void selection.start():void start()}>{starting||selection.busy?'Preparing…':'Start practice'}<ArrowUpRight size={17}/></button>{(error||selection.error)&&<p role="status">{error||selection.error}</p>}</div>
 </section>;
}
